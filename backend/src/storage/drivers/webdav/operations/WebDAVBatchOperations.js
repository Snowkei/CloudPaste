/**
 * WebDAV批量操作模块
 * 处理批量删除、批量复制等操作
 */

import { HTTPException } from "hono/http-exception";
import { ApiStatus } from "../../../../constants/index.js";

export class WebDAVBatchOperations {
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
   * 批量删除文件
   * @param {Array<string>} paths - 路径数组
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 批量删除结果
   */
  async batchRemoveItems(paths, options = {}) {
    const results = [];
    const errors = [];

    for (const path of paths) {
      try {
        const response = await this.webdavClient.delete(path);

        if (response.ok) {
          results.push({
            path,
            success: true,
            message: "删除成功",
          });
        } else {
          const errorMessage = response.status === 404 ? "文件不存在" : `删除失败: ${response.statusText}`;
          errors.push({
            path,
            success: false,
            message: errorMessage,
            status: response.status,
          });
        }
      } catch (error) {
        console.error(`删除WebDAV文件失败 [${path}]:`, error);
        errors.push({
          path,
          success: false,
          message: `删除失败: ${error.message}`,
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    return {
      success: errorCount === 0,
      message: `批量删除完成: 成功 ${successCount} 个，失败 ${errorCount} 个`,
      results,
      errors,
      total: paths.length,
      successCount,
      errorCount,
    };
  }

  /**
   * 批量复制文件
   * @param {Array<Object>} items - 复制项数组，每项包含 sourcePath 和 targetPath
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 批量复制结果
   */
  async batchCopyItems(items, options = {}) {
    const results = [];
    const errors = [];

    for (const item of items) {
      const { sourcePath, targetPath } = item;

      try {
        const response = await this.webdavClient.copy(sourcePath, targetPath, {
          overwrite: options.overwrite !== false,
          depth: options.depth || 'infinity',
        });

        if (response.ok) {
          results.push({
            sourcePath,
            targetPath,
            success: true,
            message: "复制成功",
          });
        } else {
          let errorMessage;
          if (response.status === 404) {
            errorMessage = "源文件不存在";
          } else if (response.status === 409) {
            errorMessage = "目标路径已存在";
          } else {
            errorMessage = `复制失败: ${response.statusText}`;
          }

          errors.push({
            sourcePath,
            targetPath,
            success: false,
            message: errorMessage,
            status: response.status,
          });
        }
      } catch (error) {
        console.error(`复制WebDAV文件失败 [${sourcePath} -> ${targetPath}]:`, error);
        errors.push({
          sourcePath,
          targetPath,
          success: false,
          message: `复制失败: ${error.message}`,
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    return {
      success: errorCount === 0,
      message: `批量复制完成: 成功 ${successCount} 个，失败 ${errorCount} 个`,
      results,
      errors,
      total: items.length,
      successCount,
      errorCount,
    };
  }

  /**
   * 批量移动文件
   * @param {Array<Object>} items - 移动项数组，每项包含 sourcePath 和 targetPath
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 批量移动结果
   */
  async batchMoveItems(items, options = {}) {
    const results = [];
    const errors = [];

    for (const item of items) {
      const { sourcePath, targetPath } = item;

      try {
        const response = await this.webdavClient.move(sourcePath, targetPath, {
          overwrite: options.overwrite !== false,
        });

        if (response.ok) {
          results.push({
            sourcePath,
            targetPath,
            success: true,
            message: "移动成功",
          });
        } else {
          let errorMessage;
          if (response.status === 404) {
            errorMessage = "源文件不存在";
          } else if (response.status === 409) {
            errorMessage = "目标路径已存在";
          } else {
            errorMessage = `移动失败: ${response.statusText}`;
          }

          errors.push({
            sourcePath,
            targetPath,
            success: false,
            message: errorMessage,
            status: response.status,
          });
        }
      } catch (error) {
        console.error(`移动WebDAV文件失败 [${sourcePath} -> ${targetPath}]:`, error);
        errors.push({
          sourcePath,
          targetPath,
          success: false,
          message: `移动失败: ${error.message}`,
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    return {
      success: errorCount === 0,
      message: `批量移动完成: 成功 ${successCount} 个，失败 ${errorCount} 个`,
      results,
      errors,
      total: items.length,
      successCount,
      errorCount,
    };
  }
}