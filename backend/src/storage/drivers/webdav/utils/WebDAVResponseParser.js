/**
 * WebDAV响应解析器
 * 解析WebDAV PROPFIND响应的XML数据
 */

/**
 * 解析WebDAV PROPFIND响应
 * @param {string} xmlText - XML响应文本
 * @returns {Array<Object>} 解析后的文件/目录信息数组
 */
export function parseWebDAVResponse(xmlText) {
  try {
    // 简单的XML解析，适用于大多数WebDAV服务器
    const items = [];
    
    // 使用正则表达式解析XML（简化版本）
    const responseRegex = /<d:response[^>]*>([\s\S]*?)<\/d:response>/gi;
    let match;

    while ((match = responseRegex.exec(xmlText)) !== null) {
      const responseContent = match[1];
      const item = parseResponseItem(responseContent);
      if (item) {
        items.push(item);
      }
    }

    return items;
  } catch (error) {
    console.error("解析WebDAV响应失败:", error);
    return [];
  }
}

/**
 * 解析单个响应项
 * @param {string} responseContent - 响应项内容
 * @returns {Object|null} 解析后的项信息
 */
function parseResponseItem(responseContent) {
  try {
    const item = {};

    // 解析href
    const hrefMatch = responseContent.match(/<d:href[^>]*>(.*?)<\/d:href>/i);
    if (hrefMatch) {
      item.href = decodeURIComponent(hrefMatch[1].trim());
      item.path = item.href;
      
      // 从href中提取文件名
      const pathParts = item.href.split('/').filter(Boolean);
      item.name = pathParts[pathParts.length - 1] || '';
    }

    // 解析属性
    const propstatMatch = responseContent.match(/<d:propstat[^>]*>([\s\S]*?)<\/d:propstat>/i);
    if (propstatMatch) {
      const propContent = propstatMatch[1];
      
      // 检查状态码
      const statusMatch = propContent.match(/<d:status[^>]*>HTTP\/\d\.\d\s+(\d+)/i);
      if (statusMatch && statusMatch[1] !== '200') {
        return null; // 跳过非200状态的项
      }

      const propMatch = propContent.match(/<d:prop[^>]*>([\s\S]*?)<\/d:prop>/i);
      if (propMatch) {
        const properties = propMatch[1];
        
        // 解析各种属性
        parseProperties(properties, item);
      }
    }

    return item;
  } catch (error) {
    console.error("解析响应项失败:", error);
    return null;
  }
}

/**
 * 解析属性
 * @param {string} properties - 属性XML内容
 * @param {Object} item - 项对象
 */
function parseProperties(properties, item) {
  // 解析资源类型（判断是否为目录）
  const resourceTypeMatch = properties.match(/<d:resourcetype[^>]*>([\s\S]*?)<\/d:resourcetype>/i);
  if (resourceTypeMatch) {
    const resourceType = resourceTypeMatch[1];
    item.isDirectory = resourceType.includes('<d:collection') || resourceType.includes('<d:collection/>');
  } else {
    item.isDirectory = false;
  }

  // 解析文件大小
  const contentLengthMatch = properties.match(/<d:getcontentlength[^>]*>(\d+)<\/d:getcontentlength>/i);
  if (contentLengthMatch) {
    item.size = parseInt(contentLengthMatch[1], 10);
  } else {
    item.size = item.isDirectory ? 0 : null;
  }

  // 解析最后修改时间
  const lastModifiedMatch = properties.match(/<d:getlastmodified[^>]*>(.*?)<\/d:getlastmodified>/i);
  if (lastModifiedMatch) {
    try {
      item.lastModified = new Date(lastModifiedMatch[1].trim()).toISOString();
    } catch (error) {
      item.lastModified = new Date().toISOString();
    }
  } else {
    item.lastModified = new Date().toISOString();
  }

  // 解析内容类型
  const contentTypeMatch = properties.match(/<d:getcontenttype[^>]*>(.*?)<\/d:getcontenttype>/i);
  if (contentTypeMatch) {
    item.contentType = contentTypeMatch[1].trim();
  } else {
    item.contentType = item.isDirectory ? 'httpd/unix-directory' : 'application/octet-stream';
  }

  // 解析ETag
  const etagMatch = properties.match(/<d:getetag[^>]*>(.*?)<\/d:getetag>/i);
  if (etagMatch) {
    item.etag = etagMatch[1].trim().replace(/"/g, ''); // 移除引号
  }

  // 解析创建时间（如果有）
  const creationDateMatch = properties.match(/<d:creationdate[^>]*>(.*?)<\/d:creationdate>/i);
  if (creationDateMatch) {
    try {
      item.creationDate = new Date(creationDateMatch[1].trim()).toISOString();
    } catch (error) {
      item.creationDate = item.lastModified;
    }
  } else {
    item.creationDate = item.lastModified;
  }

  // 解析显示名称（如果有）
  const displayNameMatch = properties.match(/<d:displayname[^>]*>(.*?)<\/d:displayname>/i);
  if (displayNameMatch) {
    const displayName = displayNameMatch[1].trim();
    if (displayName && displayName !== item.name) {
      item.displayName = displayName;
      item.name = displayName; // 优先使用显示名称
    }
  }
}

/**
 * 解析WebDAV错误响应
 * @param {string} xmlText - XML错误响应文本
 * @returns {Object} 错误信息
 */
export function parseWebDAVError(xmlText) {
  try {
    const errorMatch = xmlText.match(/<d:error[^>]*>([\s\S]*?)<\/d:error>/i);
    if (errorMatch) {
      const errorContent = errorMatch[1];
      
      // 尝试提取错误描述
      const descriptionMatch = errorContent.match(/<d:human-readable[^>]*>(.*?)<\/d:human-readable>/i);
      if (descriptionMatch) {
        return {
          error: true,
          message: descriptionMatch[1].trim(),
        };
      }
    }

    return {
      error: true,
      message: "WebDAV操作失败",
    };
  } catch (error) {
    return {
      error: true,
      message: "解析WebDAV错误响应失败",
    };
  }
}

/**
 * 构建WebDAV PROPFIND请求体
 * @param {Array<string>} properties - 要请求的属性列表
 * @returns {string} XML请求体
 */
export function buildPropfindRequest(properties = []) {
  if (properties.length === 0) {
    // 请求所有属性
    return `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:allprop/>
</D:propfind>`;
  }

  // 请求特定属性
  const propElements = properties.map(prop => `    <D:${prop}/>`).join('\n');
  
  return `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
${propElements}
  </D:prop>
</D:propfind>`;
}