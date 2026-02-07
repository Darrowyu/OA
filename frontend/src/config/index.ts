// 前端配置文件

// API基础配置
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  uploadURL: import.meta.env.VITE_UPLOAD_URL || 'http://localhost:3001/uploads',
  timeout: 30000, // 请求超时时间（毫秒）
}

// 应用配置
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'OA系统',
  version: import.meta.env.VITE_APP_VERSION || '2.0.0',
}

// 端口配置（与后端保持一致）
export const PORT_CONFIG = {
  frontend: 5173, // Vite开发服务器端口
  backend: 3001,  // 后端API端口
}

// 导出默认配置
export default {
  API: API_CONFIG,
  APP: APP_CONFIG,
  PORT: PORT_CONFIG,
}
