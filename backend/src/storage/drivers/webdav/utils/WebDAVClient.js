/**
 * WebDAV客户端工具类
 * 提供WebDAV协议的基础HTTP操作
 */

import { HTTPException } from "hono/http-exception";
import { ApiStatus } from "../../../../constants/index.js";
import { decryptValue } from "../../../../utils/crypto.js";

/**
 * 创建WebDAV客户端
 * @param {Object} config - WebDAV配置
 * @param {string} encryptionSecret - 加密密钥
 * @returns {Promise<WebDAVClient>} WebDAV客户端实例
 */
export async function createWebDAVClient(config, encryptionSecret) {
  try {
    // 解密敏感信息
    const decryptedConfig = {
      ...config,
      username: config.username ? await decryptValue(config.username, encryptionSecret) : null,
      password: config.password ? await decryptValue(config.password, encryptionSecret) : null,
    };

    return new WebDAVClient(decryptedConfig);
  } catch (error) {
    console.error("创建WebDAV客户端失败:", error);
    throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
      message: `创建WebDAV客户端失败: ${error.message}`,
    });
  }
}

/**
 * WebDAV客户端类
 */
export class WebDAVClient {
  /**
   * 构造函数
   * @param {Object} config - WebDAV配置
   */
  constructor(config) {
    this.config = config;
    this.baseUrl = config.url.replace(/\/$/, ''); // 移除末尾斜杠
    this.username = config.username;
    this.password = config.password;
    
    // 创建基础认证头
    this.authHeader = this._createAuthHeader();
  }

  /**
   * 创建认证头
   * @private
   * @returns {Object} 认证头对象
   */
  _createAuthHeader() {
    if (this.username && this.password) {
      const credentials = btoa(`${this.username}:${this.password}`);
      return { Authorization: `Basic ${credentials}` };
    }
    return {};
  }

  /**
   * 发送WebDAV请求
   * @param {string} method - HTTP方法
   * @param {string} path - 路径
   * @param {Object} options - 请求选项
   * @returns {Promise<Response>} 响应对象
   */
  async request(method, path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...this.authHeader,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body,
        ...options.fetchOptions,
      });

      return response;
    } catch (error) {
      console.error(`WebDAV请求失败 [${method} ${url}]:`, error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `WebDAV请求失败: ${error.message}`,
      });
    }
  }

  /**
   * PROPFIND请求 - 获取资源属性
   * @param {string} path - 路径
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async propfind(path, options = {}) {
    const depth = options.depth !== undefined ? options.depth : 1;
    const headers = {
      'Depth': depth.toString(),
      'Content-Type': 'application/xml',
    };

    const body = options.body || `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:allprop/>
</D:propfind>`;

    return await this.request('PROPFIND', path, { headers, body });
  }

  /**
   * GET请求 - 下载文件
   * @param {string} path - 文件路径
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async get(path, options = {}) {
    return await this.request('GET', path, options);
  }

  /**
   * PUT请求 - 上传文件
   * @param {string} path - 文件路径
   * @param {*} body - 文件内容
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async put(path, body, options = {}) {
    return await this.request('PUT', path, { body, ...options });
  }

  /**
   * DELETE请求 - 删除文件或目录
   * @param {string} path - 路径
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async delete(path, options = {}) {
    return await this.request('DELETE', path, options);
  }

  /**
   * MKCOL请求 - 创建目录
   * @param {string} path - 目录路径
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async mkcol(path, options = {}) {
    return await this.request('MKCOL', path, options);
  }

  /**
   * MOVE请求 - 移动/重命名文件或目录
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async move(sourcePath, targetPath, options = {}) {
    const headers = {
      'Destination': `${this.baseUrl}${targetPath}`,
      'Overwrite': options.overwrite !== false ? 'T' : 'F',
    };

    return await this.request('MOVE', sourcePath, { headers });
  }

  /**
   * COPY请求 - 复制文件或目录
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async copy(sourcePath, targetPath, options = {}) {
    const headers = {
      'Destination': `${this.baseUrl}${targetPath}`,
      'Overwrite': options.overwrite !== false ? 'T' : 'F',
      'Depth': options.depth !== undefined ? options.depth.toString() : 'infinity',
    };

    return await this.request('COPY', sourcePath, { headers });
  }

  /**
   * HEAD请求 - 检查资源是否存在
   * @param {string} path - 路径
   * @param {Object} options - 选项
   * @returns {Promise<Response>} 响应对象
   */
  async head(path, options = {}) {
    return await this.request('HEAD', path, options);
  }
}