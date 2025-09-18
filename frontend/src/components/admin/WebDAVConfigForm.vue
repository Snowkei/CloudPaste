<script setup>
import { ref, computed, watch } from "vue";
import { api } from "@/api";

// 接收props
const props = defineProps({
  darkMode: {
    type: Boolean,
    required: true,
  },
  config: {
    type: Object,
    default: null,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
});

// 定义事件
const emit = defineEmits(["close", "success"]);

// 表单数据
const formData = ref({
  name: "",
  server_url: "",
  username: "",
  password: "",
  default_folder: "",
  is_public: false,
  is_default: false,
  connection_timeout: 30,
  read_timeout: 60,
  total_storage_bytes: null,
});

// 表单状态
const loading = ref(false);
const error = ref("");
const showPassword = ref(false);

// 表单验证规则
const rules = {
  name: {
    required: true,
    message: "配置名称不能为空",
  },
  server_url: {
    required: true,
    message: "WebDAV服务器URL不能为空",
    pattern: /^https?:\/\/.+/,
    patternMessage: "请输入有效的HTTP/HTTPS URL",
  },
  username: {
    required: true,
    message: "用户名不能为空",
  },
  password: {
    required: true,
    message: "密码不能为空",
  },
};

// 表单验证状态
const validationErrors = ref({});

// 计算属性：表单是否有效
const isFormValid = computed(() => {
  return Object.keys(validationErrors.value).length === 0;
});

// 验证单个字段
const validateField = (field, value) => {
  const rule = rules[field];
  if (!rule) return true;

  if (rule.required && (!value || value.toString().trim() === "")) {
    validationErrors.value[field] = rule.message;
    return false;
  }

  if (rule.pattern && value && !rule.pattern.test(value)) {
    validationErrors.value[field] = rule.patternMessage || rule.message;
    return false;
  }

  delete validationErrors.value[field];
  return true;
};

// 验证所有字段
const validateForm = () => {
  validationErrors.value = {};
  let isValid = true;

  Object.keys(rules).forEach((field) => {
    if (!validateField(field, formData.value[field])) {
      isValid = false;
    }
  });

  return isValid;
};

// 监听表单数据变化，实时验证
watch(
  formData,
  (newData) => {
    Object.keys(newData).forEach((field) => {
      if (validationErrors.value[field]) {
        validateField(field, newData[field]);
      }
    });
  },
  { deep: true }
);

// 初始化表单数据
const initFormData = () => {
  if (props.config) {
    formData.value = {
      name: props.config.name || "",
      server_url: props.config.server_url || "",
      username: props.config.username || "",
      password: props.config.password || "",
      default_folder: props.config.default_folder || "",
      is_public: props.config.is_public || false,
      is_default: props.config.is_default || false,
      connection_timeout: props.config.connection_timeout || 30,
      read_timeout: props.config.read_timeout || 60,
      total_storage_bytes: props.config.total_storage_bytes || null,
    };
  } else {
    formData.value = {
      name: "",
      server_url: "",
      username: "",
      password: "",
      default_folder: "",
      is_public: false,
      is_default: false,
      connection_timeout: 30,
      read_timeout: 60,
      total_storage_bytes: null,
    };
  }
  validationErrors.value = {};
  error.value = "";
};

// 监听props变化
watch(() => props.config, initFormData, { immediate: true });

// 提交表单
const handleSubmit = async () => {
  if (!validateForm()) {
    error.value = "请检查表单输入";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    // 准备提交数据
    const submitData = { ...formData.value };
    
    // 处理数字字段
    if (submitData.total_storage_bytes === "" || submitData.total_storage_bytes === null) {
      submitData.total_storage_bytes = null;
    } else {
      submitData.total_storage_bytes = parseInt(submitData.total_storage_bytes);
    }

    // 确保超时时间为数字
    submitData.connection_timeout = parseInt(submitData.connection_timeout) || 30;
    submitData.read_timeout = parseInt(submitData.read_timeout) || 60;

    if (props.isEdit) {
      await api.storage.updateWebDAVConfig(props.config.id, submitData);
    } else {
      await api.storage.createWebDAVConfig(submitData);
    }

    emit("success");
  } catch (err) {
    console.error("保存WebDAV配置失败:", err);
    error.value = err.message || "保存失败，请稍后再试";
  } finally {
    loading.value = false;
  }
};

// 关闭弹窗
const handleClose = () => {
  emit("close");
};

// 格式化存储容量
const formatStorageBytes = (bytes) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <!-- 头部 -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {{ isEdit ? "编辑WebDAV配置" : "添加WebDAV配置" }}
        </h3>
        <button @click="handleClose" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 表单内容 -->
      <form @submit.prevent="handleSubmit" class="p-4 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
        <!-- 错误提示 -->
        <div v-if="error" class="p-3 rounded-md text-sm" :class="darkMode ? 'bg-red-900/40 border border-red-800 text-red-200' : 'bg-red-50 text-red-800 border border-red-200'">
          {{ error }}
        </div>

        <!-- 基础配置 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 配置名称 -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
              配置名称 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="例如：我的Nextcloud存储"
              class="w-full px-3 py-2 border rounded-md text-sm transition-colors"
              :class="[
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
                validationErrors.name ? 'border-red-500' : '',
              ]"
              @blur="validateField('name', formData.name)"
            />
            <p v-if="validationErrors.name" class="mt-1 text-sm text-red-500">{{ validationErrors.name }}</p>
          </div>

          <!-- WebDAV服务器URL -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
              WebDAV服务器URL <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.server_url"
              type="url"
              placeholder="https://your-server.com/remote.php/dav/files/username/"
              class="w-full px-3 py-2 border rounded-md text-sm transition-colors"
              :class="[
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
                validationErrors.server_url ? 'border-red-500' : '',
              ]"
              @blur="validateField('server_url', formData.server_url)"
            />
            <p v-if="validationErrors.server_url" class="mt-1 text-sm text-red-500">{{ validationErrors.server_url }}</p>
            <p class="mt-1 text-xs" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
              WebDAV服务的完整URL地址，通常以/remote.php/dav/files/用户名/结尾
            </p>
          </div>

          <!-- 用户名 -->
          <div>
            <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
              用户名 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.username"
              type="text"
              placeholder="WebDAV用户名"
              class="w-full px-3 py-2 border rounded-md text-sm transition-colors"
              :class="[
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
                validationErrors.username ? 'border-red-500' : '',
              ]"
              @blur="validateField('username', formData.username)"
            />
            <p v-if="validationErrors.username" class="mt-1 text-sm text-red-500">{{ validationErrors.username }}</p>
          </div>

          <!-- 密码 -->
          <div>
            <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
              密码 <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="WebDAV密码或应用专用密码"
                class="w-full px-3 py-2 pr-10 border rounded-md text-sm transition-colors"
                :class="[
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
                  validationErrors.password ? 'border-red-500' : '',
                ]"
                @blur="validateField('password', formData.password)"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                :class="darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'"
              >
                <svg v-if="showPassword" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <p v-if="validationErrors.password" class="mt-1 text-sm text-red-500">{{ validationErrors.password }}</p>
          </div>

          <!-- 默认文件夹 -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
              默认文件夹
            </label>
            <input
              v-model="formData.default_folder"
              type="text"
              placeholder="uploads/ (可选，留空表示根目录)"
              class="w-full px-3 py-2 border rounded-md text-sm transition-colors"
              :class="[
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
              ]"
            />
            <p class="mt-1 text-xs" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
              文件上传的默认目录，留空表示根目录
            </p>
          </div>
        </div>

        <!-- 高级配置 -->
        <div class="border-t pt-4" :class="darkMode ? 'border-gray-700' : 'border-gray-200'">
          <h4 class="text-sm font-medium mb-3" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">高级配置</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 连接超时 -->
            <div>
              <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
                连接超时时间（秒）
              </label>
              <input
                v-model.number="formData.connection_timeout"
                type="number"
                min="5"
                max="300"
                class="w-full px-3 py-2 border rounded-md text-sm transition-colors"
                :class="[
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
                ]"
              />
            </div>

            <!-- 读取超时 -->
            <div>
              <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
                读取超时时间（秒）
              </label>
              <input
                v-model.number="formData.read_timeout"
                type="number"
                min="10"
                max="600"
                class="w-full px-3 py-2 border rounded-md text-sm transition-colors"
                :class="[
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
                ]"
              />
            </div>

            <!-- 存储容量限制 -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium mb-1" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
                存储容量限制（字节）
              </label>
              <input
                v-model.number="formData.total_storage_bytes"
                type="number"
                min="0"
                placeholder="留空表示无限制"
                class="w-full px-3 py-2 border rounded-md text-sm transition-colors"
                :class="[
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500',
                ]"
              />
              <p class="mt-1 text-xs" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
                <span v-if="formData.total_storage_bytes">
                  当前设置: {{ formatStorageBytes(formData.total_storage_bytes) }}
                </span>
                <span v-else>用于计算存储使用率，留空表示无限制</span>
              </p>
            </div>
          </div>
        </div>

        <!-- 权限设置 -->
        <div class="border-t pt-4" :class="darkMode ? 'border-gray-700' : 'border-gray-200'">
          <h4 class="text-sm font-medium mb-3" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">权限设置</h4>
          
          <div class="space-y-3">
            <!-- API密钥可见 -->
            <div class="flex items-center">
              <input
                id="is_public"
                v-model="formData.is_public"
                type="checkbox"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label for="is_public" class="ml-2 text-sm" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
                允许API密钥用户使用此配置
              </label>
            </div>

            <!-- 设为默认 -->
            <div class="flex items-center">
              <input
                id="is_default"
                v-model="formData.is_default"
                type="checkbox"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label for="is_default" class="ml-2 text-sm" :class="darkMode ? 'text-gray-200' : 'text-gray-700'">
                设为默认WebDAV配置
              </label>
            </div>
          </div>
        </div>
      </form>

      <!-- 底部按钮 -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading || !isFormValid"
          class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
          :class="[
            loading || !isFormValid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700',
          ]"
        >
          <span v-if="loading" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            保存中...
          </span>
          <span v-else>{{ isEdit ? "更新配置" : "创建配置" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 确保数字输入框的样式一致 */
input[type="number"] {
  -moz-appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>