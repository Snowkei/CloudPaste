/**
 * WebDAV目录操作模块
 * 处理目录相关操作：列出内容、创建目录等
 */

import { HTTPException } from "hono/http-exception";
import { ApiStatus, FILE_TYPES } from "../../../../constants/index.js";
import { parseWebDAVResponse } from "../utils/WebDAVResponseParser.js";
import { normalizeWebDAVPath } from "../utils/WebDAVPathUtils.js";

export class WebDAVDirectoryOperations {
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
   * 列出目录内容
   * @param {string} path - 目录路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 目录内容
   */
  async listDirectory(path, options = {}) {
    try {
      const response = await this.webdavClient.propfind(path, { depth: 1 });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HTTPException(ApiStatus.NOT_FOUND, {
            message: `目录不存在: ${path}`,
          });
        }
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `列出目录失败: ${response.statusText}`,
        });
      }

      const xmlText = await response.text();
      const items = parseWebDAVResponse(xmlText);

      if (!items || items.length === 0) {
        return {
          content: [],
          readme: null,
          header: null,
          write: true,
          provider: "WebDAV",
        };
      }

      // 过滤掉当前目录本身，只保留子项
      const childItems = items.filter(item => {
        const itemPath = normalizeWebDAVPath(item.href || item.path, item.isDirectory);
        const currentPath = normalizeWebDAVPath(path, true);
        return itemPath !== currentPath;
      });

      const content = childItems.map(item => this._formatDirectoryItem(item, path));

      return {
        content,
        readme: null,
        header: null,
        write: true,
        provider: "WebDAV",
      };
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("列出WebDAV目录失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `列出目录失败: ${error.message}`,
      });
    }
  }

  /**
   * 创建目录
   * @param {string} path - 目录路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 创建结果
   */
  async createDirectory(path, options = {}) {
    try {
      const response = await this.webdavClient.mkcol(path);

      if (!response.ok) {
        if (response.status === 405) {
          throw new HTTPException(ApiStatus.CONFLICT, {
            message: `目录已存在: ${path}`,
          });
        }
        if (response.status === 409) {
          throw new HTTPException(ApiStatus.CONFLICT, {
            message: `父目录不存在: ${path}`,
          });
        }
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `创建目录失败: ${response.statusText}`,
        });
      }

      return {
        success: true,
        message: "目录创建成功",
        path,
        type: "directory",
      };
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("WebDAV创建目录失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `创建目录失败: ${error.message}`,
      });
    }
  }

  /**
   * 格式化目录项
   * @private
   * @param {Object} item - 原始目录项
   * @param {string} parentPath - 父目录路径
   * @returns {Object} 格式化后的目录项
   */
  _formatDirectoryItem(item, parentPath) {
    const name = item.name || (item.href || item.path || '').split('/').filter(Boolean).pop() || '';
    const isDirectory = item.isDirectory || false;
    const size = item.size || 0;
    const lastModified = item.lastModified || new Date().toISOString();

    return {
      name,
      size,
      is_dir: isDirectory,
      modified: lastModified,
      created: lastModified, // WebDAV通常不提供创建时间，使用修改时间
      sign: "",
      thumb: "",
      type: this._getFileType(name, isDirectory),
      hashinfo: "null",
      hash_info: null,
      raw_url: "",
      readme: "",
      header: "",
      provider: "WebDAV",
      related: null,
    };
  }

  /**
   * 获取文件类型
   * @private
   * @param {string} name - 文件名
   * @param {boolean} isDirectory - 是否为目录
   * @returns {number} 文件类型
   */
  _getFileType(name, isDirectory) {
    if (isDirectory) {
      return FILE_TYPES.FOLDER;
    }

    const extension = name.toLowerCase().split('.').pop();
    
    // 图片文件
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return FILE_TYPES.IMAGE;
    }
    
    // 视频文件
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return FILE_TYPES.VIDEO;
    }
    
    // 音频文件
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) {
      return FILE_TYPES.AUDIO;
    }
    
    // 文本文件
    if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c'].includes(extension)) {
      return FILE_TYPES.TEXT;
    }
    
    // Office文档
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
      return FILE_TYPES.OFFICE;
    }
    
    // 文档文件
    if (['pdf', 'rtf', 'odt', 'ods', 'odp'].includes(extension)) {
      return FILE_TYPES.DOCUMENT;
    }

    return FILE_TYPES.UNKNOWN;
  }
}