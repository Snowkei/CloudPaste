/**
 * WebDAV文件操作模块
 * 处理单个文件的操作：获取信息、下载、重命名、复制等
 */

import { HTTPException } from "hono/http-exception";
import { ApiStatus } from "../../../../constants/index.js";
import { parseWebDAVResponse } from "../utils/WebDAVResponseParser.js";

export class WebDAVFileOperations {
  /**
   * 构造函数
   * @param {WebDAVClient} webdavClient - WebDAV客户端
   * @param {Object} config - WebDAV配置
   * @param {string} encryptionSecret - 加密密钥
   * @param {WebDAVStorageDriver} driver - 存储驱动实例
   */
  constructor(webdavClient, config, encryptionSecret, driver) {
    this.webdavClient = webdavClient;
    this.config = config;
    this.encryptionSecret = encryptionSecret;
    this.driver = driver;
  }

  /**
   * 获取文件信息
   * @param {string} path - 文件路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 文件信息
   */
  async getFileInfo(path, options = {}) {
    try {
      const response = await this.webdavClient.propfind(path, { depth: 0 });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HTTPException(ApiStatus.NOT_FOUND, {
            message: `文件不存在: ${path}`,
          });
        }
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `获取文件信息失败: ${response.statusText}`,
        });
      }

      const xmlText = await response.text();
      const fileInfo = parseWebDAVResponse(xmlText);

      if (!fileInfo || fileInfo.length === 0) {
        throw new HTTPException(ApiStatus.NOT_FOUND, {
          message: `文件不存在: ${path}`,
        });
      }

      return this._formatFileInfo(fileInfo[0], path);
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("获取WebDAV文件信息失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `获取文件信息失败: ${error.message}`,
      });
    }
  }

  /**
   * 下载文件
   * @param {string} path - 文件路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Response>} 文件响应
   */
  async downloadFile(path, options = {}) {
    try {
      const response = await this.webdavClient.get(path);

      if (!response.ok) {
        if (response.status === 404) {
          throw new HTTPException(ApiStatus.NOT_FOUND, {
            message: `文件不存在: ${path}`,
          });
        }
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `下载文件失败: ${response.statusText}`,
        });
      }

      return response;
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("下载WebDAV文件失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `下载文件失败: ${error.message}`,
      });
    }
  }

  /**
   * 重命名文件或目录
   * @param {string} oldPath - 原路径
   * @param {string} newPath - 新路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 重命名结果
   */
  async renameItem(oldPath, newPath, options = {}) {
    try {
      const response = await this.webdavClient.move(oldPath, newPath, {
        overwrite: options.overwrite !== false,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HTTPException(ApiStatus.NOT_FOUND, {
            message: `源文件不存在: ${oldPath}`,
          });
        }
        if (response.status === 409) {
          throw new HTTPException(ApiStatus.CONFLICT, {
            message: `目标路径已存在: ${newPath}`,
          });
        }
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `重命名失败: ${response.statusText}`,
        });
      }

      return {
        success: true,
        message: "重命名成功",
        oldPath,
        newPath,
      };
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("WebDAV重命名失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `重命名失败: ${error.message}`,
      });
    }
  }

  /**
   * 复制文件或目录
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 复制结果
   */
  async copyItem(sourcePath, targetPath, options = {}) {
    try {
      const response = await this.webdavClient.copy(sourcePath, targetPath, {
        overwrite: options.overwrite !== false,
        depth: options.depth || 'infinity',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HTTPException(ApiStatus.NOT_FOUND, {
            message: `源文件不存在: ${sourcePath}`,
          });
        }
        if (response.status === 409) {
          throw new HTTPException(ApiStatus.CONFLICT, {
            message: `目标路径已存在: ${targetPath}`,
          });
        }
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `复制失败: ${response.statusText}`,
        });
      }

      return {
        success: true,
        message: "复制成功",
        sourcePath,
        targetPath,
      };
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("WebDAV复制失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `复制失败: ${error.message}`,
      });
    }
  }

  /**
   * 更新文件内容
   * @param {string} path - 文件路径
   * @param {string} content - 新内容
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 更新结果
   */
  async updateFile(path, content, options = {}) {
    try {
      const response = await this.webdavClient.put(path, content, {
        headers: {
          'Content-Type': options.contentType || 'text/plain',
        },
      });

      if (!response.ok) {
        throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
          message: `更新文件失败: ${response.statusText}`,
        });
      }

      return {
        success: true,
        message: "文件更新成功",
        path,
        size: content.length,
      };
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("WebDAV更新文件失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `更新文件失败: ${error.message}`,
      });
    }
  }

  /**
   * 检查路径是否存在
   * @param {string} path - 路径
   * @param {Object} options - 选项参数
   * @returns {Promise<boolean>} 是否存在
   */
  async exists(path, options = {}) {
    try {
      const response = await this.webdavClient.head(path);
      return response.ok;
    } catch (error) {
      console.error("检查WebDAV路径存在性失败:", error);
      return false;
    }
  }

  /**
   * 格式化文件信息
   * @private
   * @param {Object} rawInfo - 原始文件信息
   * @param {string} path - 文件路径
   * @returns {Object} 格式化后的文件信息
   */
  _formatFileInfo(rawInfo, path) {
    return {
      name: rawInfo.name || path.split('/').pop(),
      path: path,
      type: rawInfo.isDirectory ? 'directory' : 'file',
      size: rawInfo.size || 0,
      lastModified: rawInfo.lastModified || new Date().toISOString(),
      etag: rawInfo.etag || null,
      contentType: rawInfo.contentType || 'application/octet-stream',
      isDirectory: rawInfo.isDirectory || false,
    };
  }
}