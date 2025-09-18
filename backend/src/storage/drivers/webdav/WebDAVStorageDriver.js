/**
 * WebDAV存储驱动实现
 * 提供WebDAV协议的统一存储接口
 */

import { BaseDriver } from "../../interfaces/capabilities/BaseDriver.js";
import { CAPABILITIES } from "../../interfaces/capabilities/index.js";
import { HTTPException } from "hono/http-exception";
import { ApiStatus } from "../../../constants/index.js";
import { normalizeWebDAVPath } from "./utils/WebDAVPathUtils.js";
import { updateMountLastUsed } from "../../fs/utils/MountResolver.js";
import { createWebDAVClient } from "./utils/WebDAVClient.js";

// 导入各个操作模块
import { WebDAVFileOperations } from "./operations/WebDAVFileOperations.js";
import { WebDAVDirectoryOperations } from "./operations/WebDAVDirectoryOperations.js";
import { WebDAVBatchOperations } from "./operations/WebDAVBatchOperations.js";
import { WebDAVUploadOperations } from "./operations/WebDAVUploadOperations.js";

export class WebDAVStorageDriver extends BaseDriver {
  /**
   * 构造函数
   * @param {Object} config - WebDAV配置对象
   * @param {string} encryptionSecret - 加密密钥
   */
  constructor(config, encryptionSecret) {
    super(config);
    this.type = "WebDAV";
    this.encryptionSecret = encryptionSecret;
    this.webdavClient = null;

    // WebDAV存储驱动支持的能力
    this.capabilities = [
      CAPABILITIES.READER, // 读取能力：list, get, getInfo
      CAPABILITIES.WRITER, // 写入能力：put, mkdir, remove
      CAPABILITIES.ATOMIC, // 原子操作能力：rename, copy
    ];

    // 操作模块实例
    this.fileOps = null;
    this.directoryOps = null;
    this.batchOps = null;
    this.uploadOps = null;
  }

  /**
   * 初始化WebDAV存储驱动
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // 创建WebDAV客户端
      this.webdavClient = await createWebDAVClient(this.config, this.encryptionSecret);

      // 初始化各个操作模块
      this.fileOps = new WebDAVFileOperations(this.webdavClient, this.config, this.encryptionSecret, this);
      this.directoryOps = new WebDAVDirectoryOperations(this.webdavClient, this.config, this.encryptionSecret);
      this.batchOps = new WebDAVBatchOperations(this.webdavClient, this.config, this.encryptionSecret);
      this.uploadOps = new WebDAVUploadOperations(this.webdavClient, this.config, this.encryptionSecret);

      this.initialized = true;
      console.log(`WebDAV存储驱动初始化成功: ${this.config.name}`);
    } catch (error) {
      console.error("WebDAV存储驱动初始化失败:", error);
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: `WebDAV存储驱动初始化失败: ${error.message}`,
      });
    }
  }

  /**
   * 列出目录内容
   * @param {string} path - 目录路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 目录内容
   */
  async listDirectory(path, options = {}) {
    this._ensureInitialized();

    const { mount, subPath, db } = options;

    // 规范化WebDAV路径
    const webdavPath = normalizeWebDAVPath(subPath, true);

    // 更新挂载点的最后使用时间
    if (db && mount.id) {
      await updateMountLastUsed(db, mount.id);
    }

    // 委托给目录操作模块
    return await this.directoryOps.listDirectory(webdavPath, options);
  }

  /**
   * 列出目录内容 (ReaderCapable接口)
   * @param {string} path - 目录路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 目录内容
   */
  async list(path, options = {}) {
    return await this.listDirectory(path, options);
  }

  /**
   * 获取文件内容 (ReaderCapable接口)
   * @param {string} path - 文件路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Response>} 文件响应
   */
  async get(path, options = {}) {
    return await this.downloadFile(path, options);
  }

  /**
   * 获取文件信息 (ReaderCapable接口)
   * @param {string} path - 文件路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 文件信息
   */
  async getInfo(path, options = {}) {
    return await this.getFileInfo(path, options);
  }

  /**
   * 获取文件信息
   * @param {string} path - 文件路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 文件信息
   */
  async getFileInfo(path, options = {}) {
    this._ensureInitialized();

    const { subPath } = options;
    const webdavPath = normalizeWebDAVPath(subPath, false);

    return await this.fileOps.getFileInfo(webdavPath, options);
  }

  /**
   * 下载文件
   * @param {string} path - 文件路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Response>} 文件响应
   */
  async downloadFile(path, options = {}) {
    this._ensureInitialized();

    const { subPath } = options;
    const webdavPath = normalizeWebDAVPath(subPath, false);

    return await this.fileOps.downloadFile(webdavPath, options);
  }

  /**
   * 上传文件
   * @param {string} path - 目标路径
   * @param {File} file - 文件对象
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(path, file, options = {}) {
    this._ensureInitialized();

    const { subPath } = options;
    const webdavPath = normalizeWebDAVPath(subPath, false);

    return await this.uploadOps.uploadFile(webdavPath, file, options);
  }

  /**
   * 上传文件 (WriterCapable接口)
   * @param {string} path - 目标路径
   * @param {File|Buffer|Stream} data - 文件数据
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 上传结果
   */
  async put(path, data, options = {}) {
    return await this.uploadFile(path, data, options);
  }

  /**
   * 创建目录 (WriterCapable接口)
   * @param {string} path - 目录路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 创建结果
   */
  async mkdir(path, options = {}) {
    return await this.createDirectory(path, options);
  }

  /**
   * 创建目录
   * @param {string} path - 目录路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 创建结果
   */
  async createDirectory(path, options = {}) {
    this._ensureInitialized();

    const { subPath } = options;
    const webdavPath = normalizeWebDAVPath(subPath, true);

    return await this.directoryOps.createDirectory(webdavPath, options);
  }

  /**
   * 重命名文件或目录
   * @param {string} oldPath - 原路径
   * @param {string} newPath - 新路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 重命名结果
   */
  async renameItem(oldPath, newPath, options = {}) {
    this._ensureInitialized();

    const oldWebdavPath = normalizeWebDAVPath(oldPath, false);
    const newWebdavPath = normalizeWebDAVPath(newPath, false);

    return await this.fileOps.renameItem(oldWebdavPath, newWebdavPath, options);
  }

  /**
   * 重命名文件或目录 (AtomicCapable接口)
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 重命名结果
   */
  async rename(sourcePath, targetPath, options = {}) {
    return await this.renameItem(sourcePath, targetPath, options);
  }

  /**
   * 移动文件或目录 (AtomicCapable接口)
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 移动结果
   */
  async move(sourcePath, targetPath, options = {}) {
    return await this.renameItem(sourcePath, targetPath, options);
  }

  /**
   * 复制文件或目录 (AtomicCapable接口)
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 复制结果
   */
  async copy(sourcePath, targetPath, options = {}) {
    return await this.copyItem(sourcePath, targetPath, options);
  }

  /**
   * 批量删除文件
   * @param {Array<string>} paths - 路径数组
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 批量删除结果
   */
  async batchRemoveItems(paths, options = {}) {
    this._ensureInitialized();

    const webdavPaths = paths.map(path => normalizeWebDAVPath(path, false));

    return await this.batchOps.batchRemoveItems(webdavPaths, options);
  }

  /**
   * 复制文件或目录
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 复制结果
   */
  async copyItem(sourcePath, targetPath, options = {}) {
    this._ensureInitialized();

    const sourceWebdavPath = normalizeWebDAVPath(sourcePath, false);
    const targetWebdavPath = normalizeWebDAVPath(targetPath, false);

    return await this.fileOps.copyItem(sourceWebdavPath, targetWebdavPath, options);
  }

  /**
   * 批量复制文件
   * @param {Array<Object>} items - 复制项数组
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 批量复制结果
   */
  async batchCopyItems(items, options = {}) {
    this._ensureInitialized();

    const webdavItems = items.map(item => ({
      sourcePath: normalizeWebDAVPath(item.sourcePath, false),
      targetPath: normalizeWebDAVPath(item.targetPath, false)
    }));

    return await this.batchOps.batchCopyItems(webdavItems, options);
  }

  /**
   * 生成预签名URL（WebDAV不支持）
   * @param {string} path - 文件路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 预签名URL信息
   */
  async generatePresignedUrl(path, options = {}) {
    throw new HTTPException(ApiStatus.BAD_REQUEST, {
      message: "WebDAV存储不支持预签名URL功能",
    });
  }

  /**
   * 更新文件内容
   * @param {string} path - 文件路径
   * @param {string} content - 新内容
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 更新结果
   */
  async updateFile(path, content, options = {}) {
    this._ensureInitialized();

    const webdavPath = normalizeWebDAVPath(path, false);

    return await this.fileOps.updateFile(webdavPath, content, options);
  }

  /**
   * 处理跨存储复制（WebDAV不支持）
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 跨存储复制结果
   */
  async handleCrossStorageCopy(sourcePath, targetPath, options = {}) {
    throw new HTTPException(ApiStatus.BAD_REQUEST, {
      message: "WebDAV存储不支持跨存储复制功能",
    });
  }

  /**
   * 检查路径是否存在
   * @param {string} path - 路径
   * @param {Object} options - 选项参数
   * @returns {Promise<boolean>} 是否存在
   */
  async exists(path, options = {}) {
    this._ensureInitialized();

    const webdavPath = normalizeWebDAVPath(path, false);

    return await this.fileOps.exists(webdavPath, options);
  }

  /**
   * 获取存储统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    this._ensureInitialized();

    return {
      type: this.type,
      name: this.config.name,
      url: this.config.url,
      capabilities: this.capabilities,
      initialized: this.initialized
    };
  }

  /**
   * 获取文件或目录的状态信息 (BaseDriver接口)
   * @param {string} path - 文件或目录路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 状态信息对象
   */
  async stat(path, options = {}) {
    return await this.getFileInfo(path, options);
  }

  /**
   * 中止后端分片上传（WebDAV不支持）
   * @param {string} path - 目标路径
   * @param {Object} options - 选项参数
   * @returns {Promise<Object>} 中止结果
   */
  async abortBackendMultipartUpload(path, options = {}) {
    throw new HTTPException(ApiStatus.BAD_REQUEST, {
      message: "WebDAV存储不支持分片上传功能",
    });
  }

  /**
   * 确保驱动已初始化
   * @private
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new HTTPException(ApiStatus.INTERNAL_ERROR, {
        message: "WebDAV存储驱动未初始化",
      });
    }
  }
}