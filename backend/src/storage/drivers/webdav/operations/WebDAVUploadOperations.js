/**
 * WebDAV上传操作模块
 * 处理文件上传相关操作
 */

import { HTTPException } from "hono/http-exception";
import { ApiStatus } from "../../../../constants/index.js";

export class WebDAVUploadOperations {
  /**
   * 构造函数
   * @param {WebDAVClient} webdavClient - WebDAV客户端
   * @param {Object} config - WebDAV配置
   * @param {string} encryptionSecret - 加密密钥
   */
  constructor(webdavClient, config, encryptionSecret) {
    this.webdavClient = webdavClient;
    this.config = config;
    this.encryptionSecret = encryptionSecret;
  }

  /**
   * 上传文件
   * @param {string} path - 目标路径
   * @param {File|Buffer|ArrayBuffer} file - 文件对象或数据
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(path, file, options = {}) {
    try {
      let fileData;
      let contentType = 'application/octet-stream';
      let fileName = path.split('/').pop();
      let fileSize = 0;

      // 处理不同类型的文件输入
      if (file instanceof File) {
        fileData = await file.arrayBuffer();
        contentType = file.type || contentType;
        fileName = file.name || fileName;
        fileSize = file.size;
      } else if (file instanceof ArrayBuffer) {
        fileData = file;
        fileSize = file.byteLength;
      } else if (Buffer.isBuffer(file)) {
        fileData = file;
        fileSize = file.length;
      } else if (typeof file === 'string') {
        fileData = new TextEncoder().encode(file);
        contentType = 'text/plain';
        fileSize = fileData.length;
      } else {
        throw new Error("不支持的文件类型");
      }

      // 如果提供了内容类型选项，使用它
      if (options.contentType) {
        contentType = options.contentType;
      }

      const headers = {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
      };

      // 添加自定义头部
      if (options.headers) {
        Object.assign(headers, options.headers);
      }

      const response = await this.webdavClient.put(path, fileData, { headers });

      if (!response.ok) {
        if (response.status === 409) {
          throw new HTTPException(ApiStatus.CONFLICT, {
            message: `父目录不存在或路径冲突: ${path}`,
          });
        }
        if (response.status === 507) {
          throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
            message: "存储空间不足",
          });
        }
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `上传文件失败: ${response.statusText}`,
        });
      }

      // 获取响应头中的ETag（如果有）
      const etag = response.headers.get('ETag');

      return {
        success: true,
        message: "文件上传成功",
        path,
        fileName,
        size: fileSize,
        contentType,
        etag: etag || null,
        lastModified: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("WebDAV上传文件失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `上传文件失败: ${error.message}`,
      });
    }
  }

  /**
   * 上传文本内容
   * @param {string} path - 目标路径
   * @param {string} content - 文本内容
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 上传结果
   */
  async uploadTextContent(path, content, options = {}) {
    const textOptions = {
      ...options,
      contentType: options.contentType || 'text/plain; charset=utf-8',
    };

    return await this.uploadFile(path, content, textOptions);
  }

  /**
   * 上传JSON数据
   * @param {string} path - 目标路径
   * @param {Object} data - JSON数据
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 上传结果
   */
  async uploadJsonData(path, data, options = {}) {
    const jsonContent = JSON.stringify(data, null, 2);
    const jsonOptions = {
      ...options,
      contentType: 'application/json; charset=utf-8',
    };

    return await this.uploadFile(path, jsonContent, jsonOptions);
  }

  /**
   * 检查上传前的条件
   * @param {string} path - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 检查结果
   */
  async checkUploadConditions(path, options = {}) {
    try {
      // 检查文件是否已存在
      const existsResponse = await this.webdavClient.head(path);
      const fileExists = existsResponse.ok;

      // 如果文件存在且不允许覆盖，返回错误
      if (fileExists && options.overwrite === false) {
        return {
          canUpload: false,
          reason: "文件已存在且不允许覆盖",
          fileExists: true,
        };
      }

      return {
        canUpload: true,
        fileExists,
        message: fileExists ? "文件将被覆盖" : "可以上传",
      };
    } catch (error) {
      console.error("检查WebDAV上传条件失败:", error);
      return {
        canUpload: true,
        fileExists: false,
        message: "无法检查文件状态，但可以尝试上传",
      };
    }
  }
}