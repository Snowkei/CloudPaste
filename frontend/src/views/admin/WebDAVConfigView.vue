<script setup>
import { onMounted } from "vue";
import { useWebDAVConfigManagement } from "@/composables/admin-management/useWebDAVConfigManagement.js";
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

// 使用WebDAV配置管理composable
const {
  // 状态
  loading,
  error,
  webdavConfigs,
  pagination,
  pageSizeOptions,
  currentConfig,
  showAddForm,
  showEditForm,
  testResults,
  showTestDetails,
  selectedTestResult,
  showDetailedResults,

  // 方法
  loadWebDAVConfigs,
  handlePageChange,
  handleLimitChange,
  handleDeleteConfig,
  editConfig,
  addNewConfig,
  handleFormSuccess,
  handleSetDefaultConfig,
  testConnection,
  showTestDetailsModal,
  getServerIcon,
} = useWebDAVConfigManagement();

// 格式化日期 - 使用统一的时间处理工具
const formatDate = (isoDate) => {
  if (!isoDate) return "";
  return formatDateTimeWithSeconds(isoDate);
};

// 组件加载时获取列表
onMounted(() => {
  loadWebDAVConfigs();
});
</script>

<template>
  <div class="p-4 flex-1 flex flex-col overflow-y-auto">
    <h2 class="text-lg sm:text-xl font-medium mb-4" :class="darkMode ? 'text-gray-100' : 'text-gray-900'">WebDAV存储配置</h2>

    <div class="flex flex-wrap gap-3 mb-5">
      <button @click="addNewConfig" class="px-3 py-2 rounded-md flex items-center space-x-1 bg-primary-500 hover:bg-primary-600 text-white font-medium transition text-sm">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>添加新配置</span>
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

    <!-- 错误提示 -->
    <div v-if="error" class="mb-4 p-3 rounded-md text-sm" :class="darkMode ? 'bg-red-900/40 border border-red-800 text-red-200' : 'bg-red-50 text-red-800 border border-red-200'">
      <div class="flex justify-between items-start">
        <div class="flex items-start">
          <svg class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-medium">操作失败</div>
            <div class="mt-1">{{ error }}</div>
          </div>
        </div>
        <button @click="error = ''" class="text-red-400 hover:text-red-500" :class="darkMode ? 'hover:text-red-300' : 'hover:text-red-600'">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 flex flex-col">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center items-center h-40">
        <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- WebDAV配置列表 -->
      <template v-else-if="webdavConfigs.length > 0">
        <!-- 卡片网格布局 -->
        <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            <div
              v-for="config in webdavConfigs"
              :key="config.id"
              class="rounded-lg shadow-md overflow-hidden transition-colors duration-200 border relative"
              :class="[
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                config.is_default ? (darkMode ? 'ring-3 ring-primary-500 border-primary-500 shadow-lg' : 'ring-3 ring-primary-500 border-primary-500 shadow-lg') : '',
              ]"
            >
              <div class="px-4 py-3 flex justify-between items-center border-b" :class="darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'">
                <div class="flex items-center">
                  <svg class="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getServerIcon(config.server_url)" />
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
                      <span class="font-medium">服务器:</span>
                      <span class="truncate ml-2" :title="config.server_url">{{ config.server_url }}</span>
                    </div>

                    <div class="flex justify-between">
                      <span class="font-medium">用户名:</span>
                      <span>{{ config.username }}</span>
                    </div>

                    <div class="flex justify-between">
                      <span class="font-medium">默认文件夹:</span>
                      <span>{{ config.default_folder || "根目录" }}</span>
                    </div>

                    <div class="flex justify-between">
                      <span class="font-medium">连接超时:</span>
                      <span>{{ config.connection_timeout }}秒</span>
                    </div>

                    <div class="flex justify-between">
                      <span class="font-medium">读取超时:</span>
                      <span>{{ config.read_timeout }}秒</span>
                    </div>

                    <div class="flex justify-between">
                      <span class="font-medium">API密钥可见:</span>
                      <span class="flex items-center">
                        <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" :class="config.is_public ? 'text-green-500' : 'text-gray-400'">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            :d="
                              config.is_public
                                ? 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
                                : 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
                            "
                          />
                        </svg>
                        {{ config.is_public ? "允许" : "禁止" }}
                      </span>
                    </div>

                    <div class="flex justify-between">
                      <span class="font-medium">上次使用:</span>
                      <span>{{ config.last_used ? formatDate(config.last_used) : "从未使用" }}</span>
                    </div>

                    <div class="flex justify-between">
                      <span class="font-medium">创建时间:</span>
                      <span>{{ formatDate(config.created_at) }}</span>
                    </div>
                  </div>

                  <!-- 测试结果 -->
                  <div class="mt-2">
                    <div v-if="testResults[config.id] && !testResults[config.id].loading" class="mt-2">
                      <div
                        :class="[testResults[config.id].success ? 'text-green-500' : testResults[config.id].partialSuccess ? 'text-amber-500' : 'text-red-500']"
                        class="font-semibold"
                      >
                        {{ testResults[config.id].message }}
                      </div>

                      <div v-if="testResults[config.id].details" class="mt-1 text-sm whitespace-pre-line text-gray-700 dark:text-gray-300">
                        {{ testResults[config.id].details }}
                      </div>

                      <!-- 查看详情按钮 -->
                      <div v-if="testResults[config.id].result" class="mt-2">
                        <button @click="showTestDetailsModal(config.id)" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">查看详细信息</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    v-if="!config.is_default"
                    @click="handleSetDefaultConfig(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-primary-100 hover:bg-primary-200 text-primary-800'"
                  >
                    <svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    设为默认
                  </button>

                  <button
                    @click="testConnection(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="
                      testResults[config.id]?.loading
                        ? 'opacity-50 cursor-wait'
                        : darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                    "
                    :disabled="testResults[config.id]?.loading"
                  >
                    <template v-if="testResults[config.id]?.loading">
                      <svg class="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      测试中...
                    </template>
                    <template v-else>
                      <svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      测试连接
                    </template>
                  </button>

                  <button
                    @click="editConfig(config)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
                  >
                    <svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    编辑
                  </button>

                  <button
                    @click="handleDeleteConfig(config.id)"
                    class="flex items-center px-3 py-1.5 rounded text-sm font-medium transition"
                    :class="darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-800'"
                  >
                    <svg class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页组件 - 移到卡片列表外面 -->
        <div class="mt-4">
          <CommonPagination
            :dark-mode="darkMode"
            :pagination="pagination"
            :page-size-options="pageSizeOptions"
            mode="page"
            @page-changed="handlePageChange"
            @limit-changed="handleLimitChange"
          />
        </div>
      </template>

      <!-- 空状态 -->
      <div
        v-else-if="!loading"
        class="rounded-lg p-6 text-center transition-colors duration-200 flex-1 flex flex-col justify-center items-center bg-white dark:bg-gray-800 shadow-md"
        :class="darkMode ? 'text-gray-300' : 'text-gray-600'"
      >
        <svg class="mx-auto h-16 w-16 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        <h3 class="text-lg font-medium mb-2" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">还没有WebDAV存储配置</h3>
        <p class="mb-5 text-sm max-w-md">添加您的第一个WebDAV存储服务配置，支持Nextcloud、ownCloud等WebDAV兼容服务。</p>
        <button @click="addNewConfig" class="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-medium transition inline-flex items-center">
          <svg class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加配置
        </button>
      </div>
    </div>

    <!-- 添加/编辑表单弹窗 -->
    <WebDAVConfigForm
      v-if="showAddForm || showEditForm"
      :dark-mode="darkMode"
      :config="currentConfig"
      :is-edit="showEditForm"
      @close="
        showAddForm = false;
        showEditForm = false;
      "
      @success="handleFormSuccess"
    />

    <!-- 测试结果详情模态框 -->
    <div
      v-if="showTestDetails && selectedTestResult"
      class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50 overflow-y-auto"
      @click="showTestDetails = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden" @click.stop>
        <div class="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 class="text-base sm:text-lg font-medium text-gray-900 dark:text-white">WebDAV存储测试结果</h3>
          <button @click="showTestDetails = false" class="text-gray-400 hover:text-gray-500">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </div>

        <div class="p-3 sm:p-4 max-h-[70vh] overflow-y-auto">
          <!-- 连接总结 -->
          <div
            class="mb-3 p-2 sm:p-3 rounded"
            :class="[
              selectedTestResult.success
                ? 'bg-green-50 dark:bg-green-900/30'
                : selectedTestResult.partialSuccess
                ? 'bg-amber-50 dark:bg-amber-900/30'
                : 'bg-red-50 dark:bg-red-900/30',
            ]"
          >
            <div
              class="font-semibold"
              :class="[
                selectedTestResult.success
                  ? 'text-green-700 dark:text-green-400'
                  : selectedTestResult.partialSuccess
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-red-700 dark:text-red-400',
              ]"
            >
              {{ selectedTestResult.message }}
            </div>
            <div v-if="selectedTestResult.details" class="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {{ selectedTestResult.details }}
            </div>
          </div>

          <!-- 折叠/展开控制 -->
          <div class="mb-3">
            <button
              @click="showDetailedResults = !showDetailedResults"
              class="text-sm flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <svg class="h-4 w-4 mr-1 transition-transform duration-200" :class="showDetailedResults ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              {{ showDetailedResults ? "隐藏详细结果" : "显示详细结果" }}
            </button>
          </div>

          <div v-if="showDetailedResults" class="space-y-4">
            <!-- 连接测试 -->
            <div class="mb-3">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">服务器连接测试</h4>
              <div class="bg-gray-50 dark:bg-gray-900/50 rounded p-2 sm:p-3 text-xs sm:text-sm">
                <div class="flex items-center mb-1">
                  <span class="mr-1" :class="selectedTestResult.result?.connect?.success ? 'text-green-500' : 'text-red-500'">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        :d="selectedTestResult.result?.connect?.success ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'"
                      ></path>
                    </svg>
                  </span>
                  <span :class="selectedTestResult.result?.connect?.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">
                    {{ selectedTestResult.result?.connect?.success ? "服务器连接成功" : "服务器连接失败" }}
                  </span>
                </div>

                <div v-if="selectedTestResult.result?.connect?.success" class="pl-5">
                  <div class="grid grid-cols-2 gap-1">
                    <div class="text-gray-500 dark:text-gray-400">服务器URL:</div>
                    <div class="text-gray-900 dark:text-gray-200 truncate">{{ selectedTestResult.result.connect.serverUrl }}</div>

                    <div class="text-gray-500 dark:text-gray-400">响应时间:</div>
                    <div class="text-gray-900 dark:text-gray-200">{{ selectedTestResult.result.connect.responseTime }}ms</div>
                  </div>
                </div>

                <div v-if="selectedTestResult.result?.connect?.error" class="mt-1 text-red-600 dark:text-red-400">
                  <div class="font-medium text-xs">错误信息:</div>
                  <div class="bg-red-50 dark:bg-red-900/20 p-1 rounded mt-0.5 text-xs max-h-20 overflow-auto">
                    {{ selectedTestResult.result.connect.error }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 读取权限测试 -->
            <div class="mb-3">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">读取权限测试</h4>
              <div class="bg-gray-50 dark:bg-gray-900/50 rounded p-2 sm:p-3 text-xs sm:text-sm">
                <div class="flex items-center mb-1">
                  <span class="mr-1" :class="selectedTestResult.result?.read?.success ? 'text-green-500' : 'text-red-500'">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        :d="selectedTestResult.result?.read?.success ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'"
                      ></path>
                    </svg>
                  </span>
                  <span :class="selectedTestResult.result?.read?.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">
                    {{ selectedTestResult.result?.read?.success ? "读取权限测试成功" : "读取权限测试失败" }}
                  </span>
                </div>

                <div v-if="selectedTestResult.result?.read?.success" class="pl-5">
                  <div class="grid grid-cols-2 gap-1">
                    <div class="text-gray-500 dark:text-gray-400">目录路径:</div>
                    <div class="text-gray-900 dark:text-gray-200">{{ selectedTestResult.result.read.path }}</div>

                    <div class="text-gray-500 dark:text-gray-400">文件数量:</div>
                    <div class="text-gray-900 dark:text-gray-200">{{ selectedTestResult.result.read.fileCount }}</div>
                  </div>
                </div>

                <div v-if="selectedTestResult.result?.read?.error" class="mt-1 text-red-600 dark:text-red-400">
                  <div class="font-medium text-xs">错误信息:</div>
                  <div class="bg-red-50 dark:bg-red-900/20 p-1 rounded mt-0.5 text-xs max-h-20 overflow-auto">
                    {{ selectedTestResult.result.read.error }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 写入权限测试 -->
            <div class="mb-3">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">写入权限测试</h4>
              <div class="bg-gray-50 dark:bg-gray-900/50 rounded p-2 sm:p-3 text-xs sm:text-sm">
                <div class="flex items-center mb-1">
                  <span class="mr-1" :class="selectedTestResult.result?.write?.success ? 'text-green-500' : 'text-red-500'">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        :d="selectedTestResult.result?.write?.success ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'"
                      ></path>
                    </svg>
                  </span>
                  <span :class="selectedTestResult.result?.write?.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">
                    {{ selectedTestResult.result?.write?.success ? "写入权限测试成功" : "写入权限测试失败" }}
                  </span>
                </div>

                <div v-if="selectedTestResult.result?.write?.success" class="pl-5">
                  <div class="grid grid-cols-2 gap-1">
                    <div class="text-gray-500 dark:text-gray-400">测试文件:</div>
                    <div class="text-gray-900 dark:text-gray-200 truncate">{{ selectedTestResult.result.write.testFile }}</div>

                    <div v-if="selectedTestResult.result.write.uploadTime" class="text-gray-500 dark:text-gray-400">上传时间:</div>
                    <div v-if="selectedTestResult.result.write.uploadTime" class="text-gray-900 dark:text-gray-200">{{ selectedTestResult.result.write.uploadTime }}ms</div>

                    <div class="text-gray-500 dark:text-gray-400">已清理:</div>
                    <div :class="selectedTestResult.result.write.cleaned ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'">
                      {{ selectedTestResult.result.write.cleaned ? "是" : "否" }}
                    </div>
                  </div>
                </div>

                <div v-if="selectedTestResult.result?.write?.error" class="mt-1 text-red-600 dark:text-red-400">
                  <div class="font-medium text-xs">错误信息:</div>
                  <div class="bg-red-50 dark:bg-red-900/20 p-1 rounded mt-0.5 text-xs max-h-20 overflow-auto">
                    {{ selectedTestResult.result.write.error }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            @click="showTestDetails = false"
            class="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .sm\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 添加对长URL的支持 */
.break-all {
  word-break: break-all;
}

.overflow-wrap-anywhere {
  overflow-wrap: anywhere;
  word-wrap: break-word;
  -ms-word-break: break-all;
  word-break: break-word;
  hyphens: auto;
}
</style>