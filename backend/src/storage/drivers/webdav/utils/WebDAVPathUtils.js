/**
 * WebDAV路径处理工具类
 * 提供WebDAV路径的规范化和处理功能
 */

/**
 * 规范化WebDAV路径
 * @param {string} path - 原始路径
 * @param {boolean} isDirectory - 是否为目录
 * @returns {string} 规范化后的路径
 */
export function normalizeWebDAVPath(path, isDirectory = false) {
  if (!path) {
    return '/';
  }

  // 确保路径以 / 开头
  let normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // 移除重复的斜杠
  normalizedPath = normalizedPath.replace(/\/+/g, '/');

  // 如果是目录且不以 / 结尾，则添加 /
  if (isDirectory && !normalizedPath.endsWith('/')) {
    normalizedPath += '/';
  }

  // 如果不是目录且以 / 结尾，则移除 /
  if (!isDirectory && normalizedPath.endsWith('/') && normalizedPath !== '/') {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

/**
 * 连接WebDAV路径
 * @param {...string} paths - 路径片段
 * @returns {string} 连接后的路径
 */
export function joinWebDAVPath(...paths) {
  const joinedPath = paths
    .filter(path => path && path.length > 0)
    .map(path => path.replace(/^\/+|\/+$/g, '')) // 移除首尾斜杠
    .join('/');

  return `/${joinedPath}`;
}

/**
 * 获取WebDAV路径的父目录
 * @param {string} path - 文件路径
 * @returns {string} 父目录路径
 */
export function getWebDAVParentPath(path) {
  const normalizedPath = normalizeWebDAVPath(path, false);
  
  if (normalizedPath === '/') {
    return '/';
  }

  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  if (lastSlashIndex === 0) {
    return '/';
  }

  return normalizedPath.substring(0, lastSlashIndex);
}

/**
 * 获取WebDAV路径的文件名
 * @param {string} path - 文件路径
 * @returns {string} 文件名
 */
export function getWebDAVFileName(path) {
  const normalizedPath = normalizeWebDAVPath(path, false);
  
  if (normalizedPath === '/') {
    return '';
  }

  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  return normalizedPath.substring(lastSlashIndex + 1);
}

/**
 * 检查路径是否为WebDAV根路径
 * @param {string} path - 路径
 * @returns {boolean} 是否为根路径
 */
export function isWebDAVRootPath(path) {
  return normalizeWebDAVPath(path, true) === '/';
}

/**
 * 编码WebDAV路径中的特殊字符
 * @param {string} path - 原始路径
 * @returns {string} 编码后的路径
 */
export function encodeWebDAVPath(path) {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

/**
 * 解码WebDAV路径中的特殊字符
 * @param {string} path - 编码的路径
 * @returns {string} 解码后的路径
 */
export function decodeWebDAVPath(path) {
  return path
    .split('/')
    .map(segment => decodeURIComponent(segment))
    .join('/');
}