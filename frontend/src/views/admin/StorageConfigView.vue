<script setup>
import { onMounted, ref } from "vue";
import { useStorageConfigManagement } from "@/composables/admin-management/useStorageConfigManagement.js";
import { useWebDAVConfigManagement } from "@/composables/admin-management/useWebDAVConfigManagement.js";
import ConfigForm from "@/components/admin/ConfigForm.vue";
import WebDAVConfigForm from "@/components/admin/WebDAVConfigForm.vue";
import CommonPagination from "@/components/common/CommonPagination.vue";
import { formatDateTimeWithSeconds } from "@/utils/timeUtils.js";

// 接收darkMode属性
const props = defineProps({
  darkMode: {
    type: Boolean,
    required: true,
  },
});

// 当前选中的配置类型
const activeTab = ref('s3');

// 使用S3配置管理composable
const {
  // 状态
  loading: s3Loading,
  error: s3Error,
  s3Configs,
  pagination: s3Pagination,
  pageSizeOptions: s3PageSizeOptions,
  currentConfig: currentS3Config,
  showAddForm: showS3AddForm,
  showEditForm: showS3EditForm,
  testResults: s3TestResults,
  showTestDetails: showS3TestDetails,
  selectedTestResult: selectedS3TestResult,
  showDetailedResults: showS3DetailedResults,

  // 方法
  loadS3Configs,
  handlePageChange: handleS3PageChange,
  handleLimitChange: handleS3LimitChange,
  handleDeleteConfig: handleDeleteS3Config,
  editConfig: editS3Config,
  addNewConfig: addNewS3Config,
  handleFormSuccess: handleS3FormSuccess,
  handleSetDefaultConfig: handleSetDefaultS3Config,
  testConnection: testS3Connection,
  showTestDetailsModal: showS3TestDetailsModal,
  getProviderIcon,
} = useStorageConfigManagement();

// 使用WebDAV配置管理composable
const {
  // 状态
  loading: webdavLoading,
  error: webdavError,
  webdavConfigs,
  pagination: webdavPagination,
  pageSizeOptions: webdavPageSizeOptions,
  currentConfig: currentWebDAVConfig,
  showAddForm: showWebDAVAddForm,
  showEditForm: showWebDAVEditForm,
  testResults: webdavTestResults,
  showTestDetails: showWebDAVTestDetails,
  selectedTestResult: selectedWebDAVTestResult,
  showDetailedResults: showWebDAVDetailedResults,

  // 方法
  loadWebDAVConfigs,
  handlePageChange: handleWebDAVPageChange,
  handleLimitChange: handleWebDAVLimitChange,
  handleDeleteConfig: handleDeleteWebDAVConfig,
  editConfig: editWebDAVConfig,
  addNewConfig: addNewWebDAVConfig,
  handleFormSuccess: handleWebDAVFormSuccess,
  handleSetDefaultConfig: handleSetDefaultWebDAVConfig,
  testConnection: testWebDAVConnection,
  showTestDetailsModal: showWebDAVTestDetailsModal,
} = useWebDAVConfigManagement();

// 切换标签页
const switchTab = (tab) => {
  activeTab.value = tab;
  if (tab === 's3') {
    loadS3Configs();
  } else if (tab === 'webdav') {
    loadWebDAVConfigs();
  }
};

// 格式化标签
const formatLabel = (key) => {
  const labels = {
    bucket: "存储桶",
    endpoint: "终端节点",
    region: "区域",
    pathStyle: "路径样式",
    provider: "提供商",
    directory: "目录前缀",
    server_url: "服务器地址",
    username: "用户名",
    base_path: "基础路径",
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
};

// 格式化日期 - 使用统一的时间处理工具
const formatDate = (isoDate) => {
  if (!isoDate) return "";
  return formatDateTimeWithSeconds(isoDate);
};

// 组件加载时获取列表
onMounted(() => {
  switchTab('s3');
});
</script>

<template>
  <div class="p-4 flex-1 flex flex-col overflow-y-auto">
    <h2 class="text-lg sm:text-xl font-medium mb-4" :class="darkMode ? 'text-gray-100' : 'text-gray-900'">存储配置管理</h2>

    <!-- 标签页切换 -->
    <div class="flex space-x-1 mb-6 border-b" :class="darkMode ? 'border-gray-700' : 'border-gray-200'">
      <button
        @click="switchTab('s3')"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 's3' 
          ? (darkMode ? 'border-primary-400 text-primary-400' : 'border-primary-500 text-primary-600')
          : (darkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700')"
      >
        S3存储配置
      </button>
      <button
        @click="switchTab('webdav')"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'webdav' 
          ? (darkMode ? 'border-primary-400 text-primary-400' : 'border-primary-500 text-primary-600')
          : (darkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700')"
      >
        WebDAV存储配置
      </button>
    </div>

    <!-- S3配置管理 -->
    <div v-if="activeTab === 's3'">
      <div class="flex flex-wrap gap-3 mb-5">
        <button @click="addNewS3Config" class="px-3 py-2 rounded-md flex items-center space-x-1 bg-primary-500 hover:bg-primary-600 text-white font-medium transition text-sm">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>添加S3配置</span>
        </button>

        <button
          @click="loadS3Configs"
          class="px-3 py-2 rounded-md flex items-center space-x-1 font-medium transition text-sm"
          :class="darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>刷新列表</span>
        </button>
      </div>

      <!-- S3错误提示 -->
      <div v-if="s3Error" class="mb-4 p-3 rounded-md text-sm" :class="darkMode ? 'bg-red-900/40 border border-red-800 text-red-200' : 'bg-red-50 text-red-800 border border-red-200'">
        <div class="flex justify-between items-start">
          <span>{{ s3Error }}</span>
          <button @click="s3Error = ''" class="ml-2 text-red-400 hover:text-red-300">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- S3配置内容 -->
      <div class="flex-1 flex flex-col">
        <!-- 加载状态 -->
        <div v-if="s3Loading" class="flex justify-center items-center h-40">
          <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <!-- S3配置列表 -->
        <div v-else-if="s3Configs.length > 0" class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            <div
              v-for="config in s3Configs"
              :key="config.id"
              class="rounded-lg shadow-md overflow-hidden transition-colors duration-200 border relative"
              :class="[
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                config.is_default ? (darkMode ? 'ring-2 ring-primary-500 border-primary-500' : 'ring-2 ring-primary-500 border-primary-500') : '',
              ]"
            >
              <div class="px-4 py-3 flex justify-between items-center border-b" :class="darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'">
                <div class="flex items-center">
                  <svg class="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <h3 class="font-medium text-sm" :class="[darkMode ? 'text-gray-100' : 'text-gray-900', config.is_default ? 'font-semibold' : '']">
                    {{ config.name }}
                  </h3>
                  <span
                    v-if="config.is_default"
                    class="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="darkMode ? 'bg-primary-600 text-white' : 'bg-primary-500 text-white'"
                  >
                    默认
                  </span>
                </div>
                <span class="text-xs px-2 py-1 rounded-full font-medium" :class="darkMode ? 'bg-primary-900/40 text-primary-200' : 'bg-primary-100 text-primary-800'">
                  {{ config.provider_type }}
                </span>
              </div>

              <div class="p-4">
                <div :class="darkMode ? 'text-gray-300' : 'text-gray-600'">
                  <div class="grid grid-cols-1 gap-2 text-sm">
                    <div class="flex justify-between">
                      <span class="font-medium">存储桶:</span>
                      <span>{{ config.bucket_name }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-medium">区域:</span>
                      <span>{{ config.region || "自动" }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-medium">创建时间:</span>
                      <span>{{ formatDate(config.created_at) }}</span>
                    </div>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    v-if="!config.is_default"
                    @click="handleSetDefaultS3Config(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-primary-100 hover:bg-primary-200 text-primary-800'"
                  >
                    设为默认
                  </button>

                  <button
                    @click="testS3Connection(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'"
                  >
                    测试连接
                  </button>

                  <button
                    @click="editS3Config(config)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
                  >
                    编辑
                  </button>

                  <button
                    @click="handleDeleteS3Config(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-800'"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- S3分页 -->
          <div v-if="s3Pagination.total > s3Pagination.limit" class="mt-6">
            <CommonPagination
              :current-page="s3Pagination.page"
              :total-pages="s3Pagination.totalPages"
              :total-items="s3Pagination.total"
              :page-size="s3Pagination.limit"
              :page-size-options="s3PageSizeOptions"
              @page-change="handleS3PageChange"
              @limit-change="handleS3LimitChange"
              :dark-mode="darkMode"
            />
          </div>
        </div>

        <!-- S3空状态 -->
        <div v-else class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium" :class="darkMode ? 'text-gray-300' : 'text-gray-900'">暂无S3配置</h3>
          <p class="mt-1 text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">开始创建您的第一个S3存储配置</p>
          <div class="mt-6">
            <button @click="addNewS3Config" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
              <svg class="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              添加S3配置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- WebDAV配置管理 -->
    <div v-if="activeTab === 'webdav'">
      <div class="flex flex-wrap gap-3 mb-5">
        <button @click="addNewWebDAVConfig" class="px-3 py-2 rounded-md flex items-center space-x-1 bg-primary-500 hover:bg-primary-600 text-white font-medium transition text-sm">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>添加WebDAV配置</span>
        </button>

        <button
          @click="loadWebDAVConfigs"
          class="px-3 py-2 rounded-md flex items-center space-x-1 font-medium transition text-sm"
          :class="darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>刷新列表</span>
        </button>
      </div>

      <!-- WebDAV错误提示 -->
      <div v-if="webdavError" class="mb-4 p-3 rounded-md text-sm" :class="darkMode ? 'bg-red-900/40 border border-red-800 text-red-200' : 'bg-red-50 text-red-800 border border-red-200'">
        <div class="flex justify-between items-start">
          <span>{{ webdavError }}</span>
          <button @click="webdavError = ''" class="ml-2 text-red-400 hover:text-red-300">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- WebDAV配置内容 -->
      <div class="flex-1 flex flex-col">
        <!-- 加载状态 -->
        <div v-if="webdavLoading" class="flex justify-center items-center h-40">
          <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <!-- WebDAV配置列表 -->
        <div v-else-if="webdavConfigs.length > 0" class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            <div
              v-for="config in webdavConfigs"
              :key="config.id"
              class="rounded-lg shadow-md overflow-hidden transition-colors duration-200 border relative"
              :class="[
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                config.is_default ? (darkMode ? 'ring-2 ring-primary-500 border-primary-500' : 'ring-2 ring-primary-500 border-primary-500') : '',
              ]"
            >
              <div class="px-4 py-3 flex justify-between items-center border-b" :class="darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'">
                <div class="flex items-center">
                  <svg class="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  <h3 class="font-medium text-sm" :class="[darkMode ? 'text-gray-100' : 'text-gray-900', config.is_default ? 'font-semibold' : '']">
                    {{ config.name }}
                  </h3>
                  <span
                    v-if="config.is_default"
                    class="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="darkMode ? 'bg-primary-600 text-white' : 'bg-primary-500 text-white'"
                  >
                    默认
                  </span>
                </div>
                <span class="text-xs px-2 py-1 rounded-full font-medium" :class="darkMode ? 'bg-green-900/40 text-green-200' : 'bg-green-100 text-green-800'">
                  WebDAV
                </span>
              </div>

              <div class="p-4">
                <div :class="darkMode ? 'text-gray-300' : 'text-gray-600'">
                  <div class="grid grid-cols-1 gap-2 text-sm">
                    <div class="flex justify-between">
                      <span class="font-medium">服务器地址:</span>
                      <span class="truncate ml-2">{{ config.server_url }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-medium">用户名:</span>
                      <span>{{ config.username }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-medium">基础路径:</span>
                      <span>{{ config.base_path || "/" }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="font-medium">创建时间:</span>
                      <span>{{ formatDate(config.created_at) }}</span>
                    </div>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    v-if="!config.is_default"
                    @click="handleSetDefaultWebDAVConfig(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-primary-100 hover:bg-primary-200 text-primary-800'"
                  >
                    设为默认
                  </button>

                  <button
                    @click="testWebDAVConnection(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'"
                  >
                    测试连接
                  </button>

                  <button
                    @click="editWebDAVConfig(config)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
                  >
                    编辑
                  </button>

                  <button
                    @click="handleDeleteWebDAVConfig(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-800'"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- WebDAV分页 -->
          <div v-if="webdavPagination.total > webdavPagination.limit" class="mt-6">
            <CommonPagination
              :current-page="webdavPagination.page"
              :total-pages="webdavPagination.totalPages"
              :total-items="webdavPagination.total"
              :page-size="webdavPagination.limit"
              :page-size-options="webdavPageSizeOptions"
              @page-change="handleWebDAVPageChange"
              @limit-change="handleWebDAVLimitChange"
              :dark-mode="darkMode"
            />
          </div>
        </div>

        <!-- WebDAV空状态 -->
        <div v-else class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
          <h3 class="mt-2 text-sm font-medium" :class="darkMode ? 'text-gray-300' : 'text-gray-900'">暂无WebDAV配置</h3>
          <p class="mt-1 text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">开始创建您的第一个WebDAV存储配置</p>
          <div class="mt-6">
            <button @click="addNewWebDAVConfig" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
              <svg class="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              添加WebDAV配置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- S3配置表单模态框 -->
    <ConfigForm
      v-if="showS3AddForm || showS3EditForm"
      :show="showS3AddForm || showS3EditForm"
      :config="currentS3Config"
      :is-edit="showS3EditForm"
      :dark-mode="darkMode"
      @success="handleS3FormSuccess"
      @close="showS3AddForm = false; showS3EditForm = false"
    />

    <!-- WebDAV配置表单模态框 -->
    <WebDAVConfigForm
      v-if="showWebDAVAddForm || showWebDAVEditForm"
      :show="showWebDAVAddForm || showWebDAVEditForm"
      :config="currentWebDAVConfig"
      :is-edit="showWebDAVEditForm"
      :dark-mode="darkMode"
      @success="handleWebDAVFormSuccess"
      @close="showWebDAVAddForm = false; showWebDAVEditForm = false"
    />
  </div>
</template>