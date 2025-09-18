import { ref } from "vue";
import { useAdminBase } from "./useAdminBase.js";
import { api } from "@/api";

/**
 * WebDAV存储配置管理composable
 * 提供WebDAV配置的CRUD操作、分页管理、测试功能等
 */
export function useWebDAVConfigManagement() {
  // 继承基础功能，使用独立的页面标识符
  const base = useAdminBase("webdav-storage");

  // WebDAV配置特有状态
  const webdavConfigs = ref([]);
  const currentConfig = ref(null);
  const showAddForm = ref(false);
  const showEditForm = ref(false);
  const testResults = ref({});

  // 测试详情模态框状态
  const showTestDetails = ref(false);
  const selectedTestResult = ref(null);
  const showDetailedResults = ref(true);

  // WebDAV配置专用的分页选项：4、8、12
  const pageSizeOptions = [4, 8, 12];

  // 重写默认页面大小，WebDAV配置默认4个
  const getDefaultPageSize = () => {
    try {
      const saved = localStorage.getItem("admin-page-size");
      if (saved) {
        const pageSizes = JSON.parse(saved);
        const savedSize = pageSizes["webdav-storage"] || 4;
        // 确保保存的值在WebDAV配置的选项范围内，否则使用默认值4
        return pageSizeOptions.includes(savedSize) ? savedSize : 4;
      }
    } catch (error) {
      console.warn("解析WebDAV配置分页设置失败:", error);
    }
    return 4;
  };

  // 重新初始化分页状态
  base.pagination.limit = getDefaultPageSize();

  /**
   * 加载WebDAV配置列表
   */
  const loadWebDAVConfigs = async () => {
    return await base.withLoading(async () => {
      const response = await api.storage.getAllWebDAVConfigs({
        page: base.pagination.page,
        limit: base.pagination.limit,
      });

      if (response.data) {
        webdavConfigs.value = response.data;
        // 使用标准的updatePagination方法
        base.updatePagination(
          {
            total: response.total || response.data.length,
          },
          "page"
        );
        base.updateLastRefreshTime();
        console.log(`WebDAV配置列表加载完成，共 ${webdavConfigs.value.length} 条`);
      } else {
        base.showError(response.message || "加载数据失败");
        webdavConfigs.value = [];
      }
    });
  };

  /**
   * 处理页码变化
   */
  const handlePageChange = (page) => {
    base.handlePaginationChange(page, "page");
    loadWebDAVConfigs();
  };

  /**
   * 处理每页数量变化 - 使用标准方法
   */
  const handleLimitChange = (newLimit) => {
    base.changePageSize(newLimit);
    loadWebDAVConfigs();
  };

  /**
   * 删除WebDAV配置
   */
  const handleDeleteConfig = async (configId) => {
    if (!confirm("确定要删除此WebDAV配置吗？此操作不可恢复！")) {
      return;
    }

    return await base.withLoading(async () => {
      try {
        await api.storage.deleteWebDAVConfig(configId);
        base.showSuccess("删除成功");
        await loadWebDAVConfigs();
      } catch (err) {
        console.error("删除WebDAV配置失败:", err);
        if (err.message && err.message.includes("有文件正在使用")) {
          base.showError(`无法删除此配置：${err.message}`);
        } else {
          base.showError(err.message || "删除WebDAV配置失败，请稍后再试");
        }
      }
    });
  };

  /**
   * 编辑配置
   */
  const editConfig = (config) => {
    currentConfig.value = { ...config };
    showEditForm.value = true;
    showAddForm.value = false;
  };

  /**
   * 添加新配置
   */
  const addNewConfig = () => {
    currentConfig.value = null;
    showAddForm.value = true;
    showEditForm.value = false;
  };

  /**
   * 处理表单成功提交
   */
  const handleFormSuccess = async () => {
    showAddForm.value = false;
    showEditForm.value = false;
    await loadWebDAVConfigs();
  };

  /**
   * 设置默认配置
   */
  const handleSetDefaultConfig = async (configId) => {
    return await base.withLoading(async () => {
      try {
        await api.storage.setDefaultWebDAVConfig(configId);
        base.showSuccess("设置默认配置成功");
        await loadWebDAVConfigs();
      } catch (err) {
        console.error("设置默认WebDAV配置失败:", err);
        base.showError(err.message || "无法设置为默认配置，请稍后再试");
      }
    });
  };

  /**
   * 测试结果处理器类
   */
  class TestResultProcessor {
    constructor(result) {
      this.result = result;
    }

    /**
     * 计算测试状态
     */
    calculateStatus() {
      const basicConnectSuccess = this.result.connect?.success === true;
      const readSuccess = this.result.read?.success === true;
      const writeSuccess = this.result.write?.success === true;

      // 完全成功：连接、读写权限都可用
      const isFullSuccess = basicConnectSuccess && readSuccess && writeSuccess;
      // 部分成功：至少连接和读权限可用
      const isPartialSuccess = basicConnectSuccess && readSuccess && !writeSuccess;
      // 整体成功状态：至少基础连接成功
      const isSuccess = basicConnectSuccess;

      return {
        isFullSuccess,
        isPartialSuccess,
        isSuccess,
      };
    }

    /**
     * 生成状态消息
     */
    generateStatusMessage() {
      const status = this.calculateStatus();

      if (status.isFullSuccess) {
        return "WebDAV连接测试完全成功";
      } else if (status.isPartialSuccess) {
        return "WebDAV连接测试部分成功";
      } else {
        return "WebDAV连接测试失败";
      }
    }

    /**
     * 生成简洁的状态消息
     */
    generateDetailsMessage() {
      const details = [];

      // 连接状态
      if (this.result.connect?.success) {
        details.push("✓ 服务器连接正常");
      } else {
        details.push("✗ 服务器连接失败");
        if (this.result.connect?.error) {
          details.push(`  ${this.result.connect.error.split("\n")[0]}`);
        }
      }

      // 读权限状态
      if (this.result.read?.success) {
        details.push("✓ 读权限正常");
      } else {
        details.push("✗ 读权限失败");
        if (this.result.read?.error) {
          details.push(`  ${this.result.read.error.split("\n")[0]}`);
        }
      }

      // 写权限状态
      if (this.result.write?.success) {
        details.push("✓ 写权限正常");
      } else {
        details.push("✗ 写权限失败");
        if (this.result.write?.error) {
          details.push(`  ${this.result.write.error.split("\n")[0]}`);
        }
      }

      return details.join("\n");
    }
  }

  /**
   * 测试WebDAV配置连接
   */
  const testConnection = async (configId) => {
    try {
      testResults.value[configId] = { loading: true };
      const response = await api.storage.testWebDAVConfig(configId);

      // 使用测试结果处理器
      const processor = new TestResultProcessor(response.data?.result || {});
      const status = processor.calculateStatus();

      testResults.value[configId] = {
        success: status.isFullSuccess,
        partialSuccess: status.isPartialSuccess,
        message: processor.generateStatusMessage(),
        details: processor.generateDetailsMessage(),
        result: response.data?.result || {},
        loading: false,
      };
    } catch (err) {
      testResults.value[configId] = {
        success: false,
        partialSuccess: false,
        message: "测试连接失败",
        details: err.message || "无法连接到服务器",
        loading: false,
      };
    }
  };

  /**
   * 显示测试结果详情
   */
  const showTestDetailsModal = (configId) => {
    selectedTestResult.value = testResults.value[configId];
    showTestDetails.value = true;
    showDetailedResults.value = true;
  };

  /**
   * 获取WebDAV服务器类型图标
   */
  const getServerIcon = (serverUrl) => {
    if (!serverUrl) return "M3 19h18a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";
    
    const url = serverUrl.toLowerCase();
    if (url.includes("nextcloud")) {
      return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z";
    } else if (url.includes("owncloud")) {
      return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z";
    } else if (url.includes("synology")) {
      return "M4 4v16a2 2 0 002 2h12a2 2 0 002-2V8.342a2 2 0 00-.602-1.43l-4.44-4.342A2 2 0 0013.56 2H6a2 2 0 00-2 2z";
    } else {
      return "M3 19h18a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";
    }
  };

  return {
    // 继承基础功能
    ...base,

    // 重写分页选项为WebDAV配置专用
    pageSizeOptions,

    // WebDAV配置特有状态
    webdavConfigs,
    currentConfig,
    showAddForm,
    showEditForm,
    testResults,
    showTestDetails,
    selectedTestResult,
    showDetailedResults,

    // WebDAV配置管理方法
    loadWebDAVConfigs,
    handlePageChange,
    handleLimitChange,
    handleDeleteConfig,
    editConfig,
    addNewConfig,
    handleFormSuccess,
    handleSetDefaultConfig,

    // 测试功能方法
    testConnection,
    showTestDetailsModal,

    // 工具方法
    getServerIcon,
  };
}