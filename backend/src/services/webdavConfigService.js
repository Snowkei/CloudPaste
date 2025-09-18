/**
 * WebDAV存储配置服务
 */
import { ApiStatus } from "../constants/index.js";
import { HTTPException } from "hono/http-exception";
import { createErrorResponse, generateS3ConfigId, formatFileSize } from "../utils/common.js";
import { encryptValue, decryptValue } from "../utils/crypto.js";
import { WebDAVConfigRepository, FileRepository, RepositoryFactory } from "../repositories/index.js";

/**
 * WebDAV配置服务类
 */
class WebDAVConfigService {
  /**
   * 构造函数
   * @param {D1Database} db - 数据库实例
   */
  constructor(db) {
    this.webdavConfigRepository = new WebDAVConfigRepository(db);
    this.fileRepository = new FileRepository(db);
    this.db = db; // 保留db引用，用于复杂查询和测试功能
  }

  /**
   * 获取管理员的WebDAV配置列表（支持分页）
   * @param {string} adminId - 管理员ID
   * @param {Object} options - 查询选项
   * @param {number} [options.page] - 页码
   * @param {number} [options.limit] - 每页数量
   * @returns {Promise<Object>} WebDAV配置列表和分页信息
   */
  async getWebDAVConfigsByAdmin(adminId, options = {}) {
    if (options.page !== undefined || options.limit !== undefined) {
      // 明确的分页查询
      return await this.webdavConfigRepository.findByAdminWithPagination(adminId, options);
    } else {
      // 兼容性：无分页参数时返回所有数据
      const configs = await this.webdavConfigRepository.findByAdmin(adminId);
      return { configs, total: configs.length };
    }
  }

  /**
   * 获取公开的WebDAV配置列表
   * @returns {Promise<Array>} 公开的WebDAV配置列表
   */
  async getPublicWebDAVConfigs() {
    return await this.webdavConfigRepository.findPublic();
  }

  /**
   * 通过ID获取WebDAV配置（管理员访问）
   * @param {string} id - 配置ID
   * @param {string} adminId - 管理员ID
   * @returns {Promise<Object>} WebDAV配置对象
   * @throws {HTTPException} 404 - 如果配置不存在
   */
  async getWebDAVConfigByIdForAdmin(id, adminId) {
    const config = await this.webdavConfigRepository.findByIdAndAdmin(id, adminId);
    if (!config) {
      throw new HTTPException(ApiStatus.NOT_FOUND, { message: "WebDAV配置不存在" });
    }
    return config;
  }

  /**
   * 通过ID获取公开的WebDAV配置
   * @param {string} id - 配置ID
   * @returns {Promise<Object>} WebDAV配置对象
   * @throws {HTTPException} 404 - 如果配置不存在
   */
  async getPublicWebDAVConfigById(id) {
    const config = await this.webdavConfigRepository.findPublicById(id);
    if (!config) {
      throw new HTTPException(ApiStatus.NOT_FOUND, { message: "WebDAV配置不存在" });
    }
    return config;
  }

  /**
   * 创建WebDAV配置
   * @param {Object} configData - 配置数据
   * @param {string} adminId - 管理员ID
   * @param {string} encryptionSecret - 加密密钥
   * @returns {Promise<Object>} 创建的WebDAV配置
   * @throws {HTTPException} 400 - 参数错误
   */
  async createWebDAVConfig(configData, adminId, encryptionSecret) {
    // 验证必填字段
    const requiredFields = ["name", "server_url", "username", "password"];
    for (const field of requiredFields) {
      if (!configData[field]) {
        throw new HTTPException(ApiStatus.BAD_REQUEST, { message: `缺少必填字段: ${field}` });
      }
    }

    // 生成唯一ID
    const id = generateS3ConfigId(); // 复用S3的ID生成函数

    // 加密敏感字段
    const encryptedUsername = await encryptValue(configData.username, encryptionSecret);
    const encryptedPassword = await encryptValue(configData.password, encryptionSecret);

    // 获取可选字段或设置默认值
    const defaultFolder = configData.default_folder || "";
    const isPublic = configData.is_public === true ? 1 : 0;
    const connectionTimeout = parseInt(configData.connection_timeout) || 30;
    const readTimeout = parseInt(configData.read_timeout) || 60;

    // 处理存储总容量
    let totalStorageBytes = null;
    if (configData.total_storage_bytes !== undefined) {
      // 如果用户提供了总容量，则直接使用
      const storageValue = parseInt(configData.total_storage_bytes);
      if (!isNaN(storageValue) && storageValue > 0) {
        totalStorageBytes = storageValue;
      }
    }

    // 如果未提供存储容量，设置默认值
    if (totalStorageBytes === null) {
      totalStorageBytes = 10 * 1024 * 1024 * 1024; // 10GB默认值
      console.log(`未提供存储容量限制，为WebDAV设置默认值: ${formatFileSize(totalStorageBytes)}`);
    }

    // 准备创建数据
    const createData = {
      id,
      name: configData.name,
      server_url: configData.server_url,
      username: encryptedUsername,
      password: encryptedPassword,
      default_folder: defaultFolder,
      is_public: isPublic,
      admin_id: adminId,
      total_storage_bytes: totalStorageBytes,
      connection_timeout: connectionTimeout,
      read_timeout: readTimeout,
    };

    // 创建WebDAV配置
    await this.webdavConfigRepository.createConfig(createData);

    // 返回创建成功响应（不包含敏感字段）
    return {
      id,
      name: configData.name,
      server_url: configData.server_url,
      default_folder: defaultFolder,
      is_public: isPublic === 1,
      total_storage_bytes: totalStorageBytes,
      connection_timeout: connectionTimeout,
      read_timeout: readTimeout,
    };
  }

  /**
   * 更新WebDAV配置
   * @param {string} id - 配置ID
   * @param {Object} updateData - 更新数据
   * @param {string} adminId - 管理员ID
   * @param {string} encryptionSecret - 加密密钥
   * @returns {Promise<void>}
   * @throws {HTTPException} 404 - 配置不存在
   */
  async updateWebDAVConfig(id, updateData, adminId, encryptionSecret) {
    // 查询配置是否存在
    const config = await this.webdavConfigRepository.findByIdAndAdmin(id, adminId);
    if (!config) {
      throw new HTTPException(ApiStatus.NOT_FOUND, { message: "WebDAV配置不存在" });
    }

    // 准备更新数据
    const repoUpdateData = {};

    // 处理存储容量字段
    if (updateData.total_storage_bytes !== undefined) {
      if (updateData.total_storage_bytes === null) {
        // 为null表示使用默认值
        const defaultStorageBytes = 10 * 1024 * 1024 * 1024; // 10GB 默认值
        repoUpdateData.total_storage_bytes = defaultStorageBytes;
        console.log(`重置存储容量限制，为WebDAV设置默认值: ${formatFileSize(defaultStorageBytes)}`);
      } else {
        // 用户提供了具体数值
        const storageValue = parseInt(updateData.total_storage_bytes);
        if (!isNaN(storageValue) && storageValue > 0) {
          repoUpdateData.total_storage_bytes = storageValue;
        }
      }
    }

    // 更新名称
    if (updateData.name !== undefined) {
      repoUpdateData.name = updateData.name;
    }

    // 更新服务器URL
    if (updateData.server_url !== undefined) {
      repoUpdateData.server_url = updateData.server_url;
    }

    // 更新用户名（需要加密）
    if (updateData.username !== undefined) {
      const encryptedUsername = await encryptValue(updateData.username, encryptionSecret);
      repoUpdateData.username = encryptedUsername;
    }

    // 更新密码（需要加密）
    if (updateData.password !== undefined) {
      const encryptedPassword = await encryptValue(updateData.password, encryptionSecret);
      repoUpdateData.password = encryptedPassword;
    }

    // 更新默认文件夹
    if (updateData.default_folder !== undefined) {
      repoUpdateData.default_folder = updateData.default_folder;
    }

    // 更新是否公开
    if (updateData.is_public !== undefined) {
      repoUpdateData.is_public = updateData.is_public === true ? 1 : 0;
    }

    // 更新连接超时时间
    if (updateData.connection_timeout !== undefined) {
      const timeout = parseInt(updateData.connection_timeout);
      repoUpdateData.connection_timeout = !isNaN(timeout) && timeout > 0 ? timeout : 30;
    }

    // 更新读取超时时间
    if (updateData.read_timeout !== undefined) {
      const timeout = parseInt(updateData.read_timeout);
      repoUpdateData.read_timeout = !isNaN(timeout) && timeout > 0 ? timeout : 60;
    }

    // 如果没有更新字段，直接返回成功
    if (Object.keys(repoUpdateData).length === 0) {
      return;
    }

    // 执行更新
    await this.webdavConfigRepository.updateConfig(id, repoUpdateData);
  }

  /**
   * 删除WebDAV配置
   * @param {string} id - 配置ID
   * @param {string} adminId - 管理员ID
   * @returns {Promise<void>}
   * @throws {HTTPException} 404/409 - 配置不存在或有文件使用
   */
  async deleteWebDAVConfig(id, adminId) {
    // 查询配置是否存在
    const existingConfig = await this.webdavConfigRepository.findByIdAndAdmin(id, adminId);
    if (!existingConfig) {
      throw new HTTPException(ApiStatus.NOT_FOUND, { message: "WebDAV配置不存在" });
    }

    // 检查是否有文件使用此配置
    const filesCount = await this.fileRepository.countByStorageConfigId(id, "WebDAV");
    if (filesCount > 0) {
      throw new HTTPException(ApiStatus.CONFLICT, { message: `无法删除此配置，因为有${filesCount}个文件正在使用它` });
    }

    // 执行删除操作
    await this.webdavConfigRepository.deleteConfig(id);
  }

  /**
   * 设置默认WebDAV配置
   * @param {string} id - 配置ID
   * @param {string} adminId - 管理员ID
   * @returns {Promise<void>}
   * @throws {HTTPException} 404 - 配置不存在
   */
  async setDefaultWebDAVConfig(id, adminId) {
    // 查询配置是否存在
    const config = await this.webdavConfigRepository.findByIdAndAdmin(id, adminId);
    if (!config) {
      throw new HTTPException(ApiStatus.NOT_FOUND, { message: "WebDAV配置不存在" });
    }

    // 设置默认配置（Repository会处理原子操作）
    await this.webdavConfigRepository.setAsDefault(id, adminId);
  }

  /**
   * 获取带使用情况的WebDAV配置列表
   * @returns {Promise<Array>} WebDAV配置列表
   */
  async getWebDAVConfigsWithUsage() {
    return await this.webdavConfigRepository.findAllWithUsage();
  }
}

/**
 * 测试WebDAV配置连接
 * @param {D1Database} db - D1数据库实例
 * @param {string} id - 配置ID
 * @param {string} adminId - 管理员ID
 * @param {string} encryptionSecret - 加密密钥
 * @param {string} requestOrigin - 请求来源
 * @returns {Promise<Object>} 测试结果
 */
export async function testWebDAVConnection(db, id, adminId, encryptionSecret, requestOrigin) {
  // 使用 WebDAVConfigRepository 获取配置（需要包含敏感字段用于测试）
  const repositoryFactory = new RepositoryFactory(db);
  const webdavConfigRepository = repositoryFactory.getWebDAVConfigRepository();

  const config = await webdavConfigRepository.findByIdAndAdminWithSecrets(id, adminId);

  if (!config) {
    throw new HTTPException(ApiStatus.NOT_FOUND, { message: "WebDAV配置不存在" });
  }

  // 解密敏感字段
  const username = await decryptValue(config.username, encryptionSecret);
  const password = await decryptValue(config.password, encryptionSecret);

  // 初始化测试结果
  const testResult = {
    connect: { success: false, error: null, note: "测试WebDAV服务器连接" },
    auth: { success: false, error: null, note: "测试WebDAV认证" },
    read: { success: false, error: null, note: "测试WebDAV读取权限" },
    write: { success: false, error: null, note: "测试WebDAV写入权限" },
    connectionInfo: {
      serverUrl: config.server_url,
      username: username,
      defaultFolder: config.default_folder || "",
      connectionTimeout: `${config.connection_timeout || 30}秒`,
      readTimeout: `${config.read_timeout || 60}秒`,
    },
  };

  // 执行测试步骤
  await executeWebDAVConnectTest(testResult, config, username, password);
  await executeWebDAVAuthTest(testResult, config, username, password);
  await executeWebDAVReadTest(testResult, config, username, password);
  await executeWebDAVWriteTest(testResult, config, username, password);

  // 更新最后使用时间
  await updateWebDAVLastUsedTime(db, id);

  // 生成测试结果摘要
  const summary = generateWebDAVTestSummary(testResult);

  return {
    success: summary.overallSuccess,
    message: summary.message,
    result: testResult,
  };
}

/**
 * 执行WebDAV连接测试
 */
async function executeWebDAVConnectTest(testResult, config, username, password) {
  try {
    const serverUrl = config.server_url.endsWith('/') ? config.server_url.slice(0, -1) : config.server_url;
    const testUrl = `${serverUrl}/`;

    const response = await fetch(testUrl, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      },
      signal: AbortSignal.timeout((config.connection_timeout || 30) * 1000),
    });

    if (response.ok || response.status === 401) {
      // 401也算连接成功，只是认证失败
      testResult.connect.success = true;
      testResult.connect.statusCode = response.status;
      testResult.connect.note = "WebDAV服务器连接成功";
    } else {
      testResult.connect.success = false;
      testResult.connect.statusCode = response.status;
      testResult.connect.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    testResult.connect.success = false;
    testResult.connect.error = error.message;
    if (error.name === 'TimeoutError') {
      testResult.connect.note = "连接超时，请检查服务器地址和网络连接";
    }
  }
}

/**
 * 执行WebDAV认证测试
 */
async function executeWebDAVAuthTest(testResult, config, username, password) {
  try {
    const serverUrl = config.server_url.endsWith('/') ? config.server_url.slice(0, -1) : config.server_url;
    const defaultFolder = config.default_folder || "";
    const testPath = defaultFolder ? (defaultFolder.startsWith('/') ? defaultFolder : `/${defaultFolder}`) : "/";
    const testUrl = `${serverUrl}${testPath}`;

    const response = await fetch(testUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Depth': '0',
        'Content-Type': 'application/xml',
      },
      body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><resourcetype/></prop></propfind>',
      signal: AbortSignal.timeout((config.connection_timeout || 30) * 1000),
    });

    if (response.ok) {
      testResult.auth.success = true;
      testResult.auth.statusCode = response.status;
      testResult.auth.note = "WebDAV认证成功";
    } else if (response.status === 401) {
      testResult.auth.success = false;
      testResult.auth.statusCode = response.status;
      testResult.auth.error = "认证失败，请检查用户名和密码";
    } else {
      testResult.auth.success = false;
      testResult.auth.statusCode = response.status;
      testResult.auth.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    testResult.auth.success = false;
    testResult.auth.error = error.message;
  }
}

/**
 * 执行WebDAV读取测试
 */
async function executeWebDAVReadTest(testResult, config, username, password) {
  try {
    const serverUrl = config.server_url.endsWith('/') ? config.server_url.slice(0, -1) : config.server_url;
    const defaultFolder = config.default_folder || "";
    const testPath = defaultFolder ? (defaultFolder.startsWith('/') ? defaultFolder : `/${defaultFolder}`) : "/";
    const testUrl = `${serverUrl}${testPath}`;

    const response = await fetch(testUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Depth': '1',
        'Content-Type': 'application/xml',
      },
      body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><resourcetype/><getcontentlength/><getlastmodified/></prop></propfind>',
      signal: AbortSignal.timeout((config.read_timeout || 60) * 1000),
    });

    if (response.ok) {
      testResult.read.success = true;
      testResult.read.statusCode = response.status;
      testResult.read.note = "WebDAV读取权限测试成功";
      
      // 尝试解析响应内容
      try {
        const responseText = await response.text();
        const fileCount = (responseText.match(/<D:response>/g) || []).length - 1; // 减去目录本身
        testResult.read.fileCount = Math.max(0, fileCount);
      } catch (parseError) {
        testResult.read.note += "，但无法解析目录内容";
      }
    } else {
      testResult.read.success = false;
      testResult.read.statusCode = response.status;
      testResult.read.error = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    testResult.read.success = false;
    testResult.read.error = error.message;
  }
}

/**
 * 执行WebDAV写入测试
 */
async function executeWebDAVWriteTest(testResult, config, username, password) {
  try {
    const serverUrl = config.server_url.endsWith('/') ? config.server_url.slice(0, -1) : config.server_url;
    const defaultFolder = config.default_folder || "";
    const timestamp = Date.now();
    const testFileName = `__cloudpaste_test_${timestamp}.txt`;
    const testPath = defaultFolder ? 
      (defaultFolder.startsWith('/') ? `${defaultFolder}/${testFileName}` : `/${defaultFolder}/${testFileName}`) : 
      `/${testFileName}`;
    const testUrl = `${serverUrl}${testPath}`;
    const testContent = `CloudPaste WebDAV测试文件\n时间: ${new Date().toISOString()}\n测试ID: ${timestamp}`;

    // 上传测试文件
    const uploadStartTime = performance.now();
    const uploadResponse = await fetch(testUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'text/plain',
        'Content-Length': testContent.length.toString(),
      },
      body: testContent,
      signal: AbortSignal.timeout((config.read_timeout || 60) * 1000),
    });

    const uploadEndTime = performance.now();

    if (uploadResponse.ok || uploadResponse.status === 201) {
      testResult.write.success = true;
      testResult.write.statusCode = uploadResponse.status;
      testResult.write.uploadTime = Math.round(uploadEndTime - uploadStartTime);
      testResult.write.testFile = testPath;
      testResult.write.note = "WebDAV写入权限测试成功";

      // 尝试删除测试文件
      try {
        const deleteResponse = await fetch(testUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          },
          signal: AbortSignal.timeout((config.connection_timeout || 30) * 1000),
        });
        testResult.write.cleaned = deleteResponse.ok;
      } catch (cleanupError) {
        testResult.write.cleaned = false;
        testResult.write.cleanupError = cleanupError.message;
      }
    } else {
      testResult.write.success = false;
      testResult.write.statusCode = uploadResponse.status;
      testResult.write.error = `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`;
    }
  } catch (error) {
    testResult.write.success = false;
    testResult.write.error = error.message;
  }
}

/**
 * 更新WebDAV配置的最后使用时间
 */
async function updateWebDAVLastUsedTime(db, configId) {
  const repositoryFactory = new RepositoryFactory(db);
  const webdavConfigRepository = repositoryFactory.getWebDAVConfigRepository();
  await webdavConfigRepository.updateLastUsed(configId);
}

/**
 * 生成WebDAV测试结果摘要
 */
function generateWebDAVTestSummary(testResult) {
  let message = "WebDAV配置测试";

  const connectSuccess = testResult.connect.success;
  const authSuccess = testResult.auth.success;
  const readSuccess = testResult.read.success;
  const writeSuccess = testResult.write.success;

  let overallSuccess = connectSuccess && authSuccess && readSuccess;

  if (connectSuccess) {
    if (authSuccess) {
      if (readSuccess) {
        if (writeSuccess) {
          message += "成功 (连接、认证、读写权限均可用)";
        } else {
          message += "部分成功 (连接、认证、读取权限可用，写入权限不可用)";
        }
      } else {
        message += "部分成功 (连接、认证成功，但读取权限不可用)";
      }
    } else {
      message += "失败 (连接成功但认证失败)";
    }
  } else {
    message += "失败 (无法连接到WebDAV服务器)";
  }

  return {
    overallSuccess,
    message,
  };
}

// ==================== 向后兼容的导出函数 ====================

/**
 * 获取WebDAV配置列表（向后兼容，支持分页）
 */
export async function getWebDAVConfigsByAdmin(db, adminId, options = {}) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.getWebDAVConfigsByAdmin(adminId, options);
}

/**
 * 获取公开的WebDAV配置列表（向后兼容）
 */
export async function getPublicWebDAVConfigs(db) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.getPublicWebDAVConfigs();
}

/**
 * 通过ID获取WebDAV配置（管理员访问，向后兼容）
 */
export async function getWebDAVConfigByIdForAdmin(db, id, adminId) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.getWebDAVConfigByIdForAdmin(id, adminId);
}

/**
 * 通过ID获取公开的WebDAV配置（向后兼容）
 */
export async function getPublicWebDAVConfigById(db, id) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.getPublicWebDAVConfigById(id);
}

/**
 * 创建WebDAV配置（向后兼容）
 */
export async function createWebDAVConfig(db, configData, adminId, encryptionSecret) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.createWebDAVConfig(configData, adminId, encryptionSecret);
}

/**
 * 更新WebDAV配置（向后兼容）
 */
export async function updateWebDAVConfig(db, id, updateData, adminId, encryptionSecret) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.updateWebDAVConfig(id, updateData, adminId, encryptionSecret);
}

/**
 * 删除WebDAV配置（向后兼容）
 */
export async function deleteWebDAVConfig(db, id, adminId) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.deleteWebDAVConfig(id, adminId);
}

/**
 * 设置默认WebDAV配置（向后兼容）
 */
export async function setDefaultWebDAVConfig(db, id, adminId) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.setDefaultWebDAVConfig(id, adminId);
}

/**
 * 获取带使用情况的WebDAV配置列表（向后兼容）
 */
export async function getWebDAVConfigsWithUsage(db) {
  const webdavConfigService = new WebDAVConfigService(db);
  return await webdavConfigService.getWebDAVConfigsWithUsage();
}