/**
 * WebDAV存储配置路由
 */
import { Hono } from "hono";
import { authGateway } from "../middlewares/authGatewayMiddleware.js";
import {
  getWebDAVConfigsByAdmin,
  getPublicWebDAVConfigs,
  getWebDAVConfigByIdForAdmin,
  getPublicWebDAVConfigById,
  createWebDAVConfig,
  updateWebDAVConfig,
  deleteWebDAVConfig,
  setDefaultWebDAVConfig,
  testWebDAVConnection,
  getWebDAVConfigsWithUsage,
} from "../services/webdavConfigService.js";
import { DbTables, ApiStatus } from "../constants/index.js";
import { createErrorResponse } from "../utils/common.js";
import { HTTPException } from "hono/http-exception";

const webdavConfigRoutes = new Hono();

// 获取WebDAV配置列表（管理员权限或API密钥文件权限，支持分页）
webdavConfigRoutes.get("/api/webdav-configs", authGateway.requireFile(), async (c) => {
  const db = c.env.DB;

  try {
    const isAdmin = authGateway.utils.isAdmin(c);
    const adminId = authGateway.utils.getUserId(c);

    if (isAdmin) {
      // 管理员：区分分页请求和兼容性请求
      const hasPageParam = c.req.query("page") !== undefined;
      const hasLimitParam = c.req.query("limit") !== undefined;

      if (hasPageParam || hasLimitParam) {
        // 明确的分页查询
        const limit = parseInt(c.req.query("limit") || "10");
        const page = parseInt(c.req.query("page") || "1");
        const result = await getWebDAVConfigsByAdmin(db, adminId, { page, limit });

        return c.json({
          code: ApiStatus.SUCCESS,
          message: "获取WebDAV配置列表成功",
          data: result.configs,
          total: result.total,
          success: true,
        });
      } else {
        // 兼容性：返回所有数据（用于下拉选项等场景）
        const result = await getWebDAVConfigsByAdmin(db, adminId);

        return c.json({
          code: ApiStatus.SUCCESS,
          message: "获取WebDAV配置列表成功",
          data: result.configs,
          total: result.total,
          success: true,
        });
      }
    } else {
      // API密钥用户只能看到公开的配置（暂不支持分页）
      const configs = await getPublicWebDAVConfigs(db);

      return c.json({
        code: ApiStatus.SUCCESS,
        message: "获取WebDAV配置列表成功",
        data: configs,
        total: configs.length,
        success: true,
      });
    }
  } catch (error) {
    console.error("获取WebDAV配置列表错误:", error);
    return c.json(createErrorResponse(ApiStatus.INTERNAL_ERROR, error.message || "获取WebDAV配置列表失败"), ApiStatus.INTERNAL_ERROR);
  }
});

// 获取单个WebDAV配置详情
webdavConfigRoutes.get("/api/webdav-configs/:id", authGateway.requireFile(), async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();

  try {
    let config;
    const isAdmin = authGateway.utils.isAdmin(c);
    const adminId = authGateway.utils.getUserId(c);

    if (isAdmin) {
      // 管理员查询
      config = await getWebDAVConfigByIdForAdmin(db, id, adminId);
    } else {
      // API密钥用户查询
      config = await getPublicWebDAVConfigById(db, id);
    }

    return c.json({
      code: ApiStatus.SUCCESS,
      message: "获取WebDAV配置成功",
      data: config, // 不返回敏感字段
      success: true,
    });
  } catch (error) {
    console.error("获取WebDAV配置错误:", error);
    return c.json(createErrorResponse(ApiStatus.INTERNAL_ERROR, error.message || "获取WebDAV配置失败"), ApiStatus.INTERNAL_ERROR);
  }
});

// 创建WebDAV配置（管理员权限）
webdavConfigRoutes.post("/api/webdav-configs", authGateway.requireAdmin(), async (c) => {
  const db = c.env.DB;
  const adminId = authGateway.utils.getUserId(c);
  const encryptionSecret = c.env.ENCRYPTION_SECRET || "default-encryption-key";

  try {
    const body = await c.req.json();
    const config = await createWebDAVConfig(db, body, adminId, encryptionSecret);

    // 返回创建成功响应
    return c.json({
      code: ApiStatus.CREATED,
      message: "WebDAV配置创建成功",
      data: config,
      success: true,
    });
  } catch (error) {
    console.error("创建WebDAV配置错误:", error);
    return c.json(createErrorResponse(ApiStatus.INTERNAL_ERROR, error.message || "创建WebDAV配置失败"), ApiStatus.INTERNAL_ERROR);
  }
});

// 更新WebDAV配置（管理员权限）
webdavConfigRoutes.put("/api/webdav-configs/:id", authGateway.requireAdmin(), async (c) => {
  const db = c.env.DB;
  const adminId = authGateway.utils.getUserId(c);
  const { id } = c.req.param();
  const encryptionSecret = c.env.ENCRYPTION_SECRET || "default-encryption-key";

  try {
    const body = await c.req.json();
    await updateWebDAVConfig(db, id, body, adminId, encryptionSecret);

    // WebDAV配置更新后，清理相关的驱动缓存
    try {
      const { MountManager } = await import("../storage/managers/MountManager.js");
      const mountManager = new MountManager(db, encryptionSecret);
      await mountManager.clearConfigCache("WebDAV", id);
      console.log(`WebDAV配置更新后已清理驱动缓存: ${id}`);
    } catch (cacheError) {
      console.warn("清理驱动缓存失败:", cacheError);
      // 缓存清理失败不影响主要操作
    }

    return c.json({
      code: ApiStatus.SUCCESS,
      message: "WebDAV配置已更新",
      success: true,
    });
  } catch (error) {
    console.error("更新WebDAV配置错误:", error);
    return c.json(createErrorResponse(ApiStatus.INTERNAL_ERROR, error.message || "更新WebDAV配置失败"), ApiStatus.INTERNAL_ERROR);
  }
});

// 删除WebDAV配置（管理员权限）
webdavConfigRoutes.delete("/api/webdav-configs/:id", authGateway.requireAdmin(), async (c) => {
  const db = c.env.DB;
  const adminId = authGateway.utils.getUserId(c);
  const { id } = c.req.param();
  const encryptionSecret = c.env.ENCRYPTION_SECRET || "default-encryption-key";

  try {
    // WebDAV配置删除前，先清理相关的驱动缓存
    try {
      const { MountManager } = await import("../storage/managers/MountManager.js");
      const mountManager = new MountManager(db, encryptionSecret);
      await mountManager.clearConfigCache("WebDAV", id);
      console.log(`WebDAV配置删除前已清理驱动缓存: ${id}`);
    } catch (cacheError) {
      console.warn("清理驱动缓存失败:", cacheError);
      // 缓存清理失败不影响主要操作
    }

    await deleteWebDAVConfig(db, id, adminId);

    return c.json({
      code: ApiStatus.SUCCESS,
      message: "WebDAV配置删除成功",
      success: true,
    });
  } catch (error) {
    console.error("删除WebDAV配置错误:", error);
    return c.json(createErrorResponse(ApiStatus.INTERNAL_ERROR, error.message || "删除WebDAV配置失败"), ApiStatus.INTERNAL_ERROR);
  }
});

// 设置默认WebDAV配置（管理员权限）
webdavConfigRoutes.put("/api/webdav-configs/:id/set-default", authGateway.requireAdmin(), async (c) => {
  const db = c.env.DB;
  const adminId = authGateway.utils.getUserId(c);
  const { id } = c.req.param();

  try {
    await setDefaultWebDAVConfig(db, id, adminId);

    return c.json({
      code: ApiStatus.SUCCESS,
      message: "默认WebDAV配置设置成功",
      success: true,
    });
  } catch (error) {
    console.error("设置默认WebDAV配置错误:", error);
    return c.json(createErrorResponse(ApiStatus.INTERNAL_ERROR, error.message || "设置默认WebDAV配置失败"), ApiStatus.INTERNAL_ERROR);
  }
});

// 测试WebDAV配置连接（管理员权限）
webdavConfigRoutes.post("/api/webdav-configs/:id/test", authGateway.requireAdmin(), async (c) => {
  const db = c.env.DB;
  const adminId = authGateway.utils.getUserId(c);
  const { id } = c.req.param();
  const encryptionSecret = c.env.ENCRYPTION_SECRET || "default-encryption-key";
  const requestOrigin = c.req.header("origin");

  try {
    const testResult = await testWebDAVConnection(db, id, adminId, encryptionSecret, requestOrigin);

    return c.json({
      code: ApiStatus.SUCCESS,
      message: testResult.message,
      data: {
        success: testResult.success,
        result: testResult.result,
      },
      success: true,
    });
  } catch (error) {
    console.error("测试WebDAV配置错误:", error);
    return c.json(
      {
        code: ApiStatus.INTERNAL_ERROR,
        message: error.message || "测试WebDAV配置失败",
        data: {
          success: false,
          result: {
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : null,
          },
        },
        success: false,
      },
      ApiStatus.INTERNAL_ERROR
    );
  }
});

export default webdavConfigRoutes;