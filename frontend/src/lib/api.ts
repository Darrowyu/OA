import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { getUserFriendlyMessage, isApiError } from './error-handler';

const API_BASE_URL = '/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一错误处理
axiosInstance.interceptors.response.use(
  (response) => {
    // 对于blob类型的响应，直接返回response以便获取blob数据
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response.data;
  },
  (error: AxiosError) => {
    // 获取错误响应数据
    const errorData = error.response?.data;

    // 处理401未授权
    if (error.response?.status === 401) {
      const isTokenExpired = isApiError(errorData) && errorData.error.code === 'TOKEN_EXPIRED';

      // 清除登录状态
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // 显示错误提示
      toast.error(isTokenExpired ? '登录已过期，请重新登录' : '请先登录');

      // 重定向到登录页（如果不是在登录页）
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      return Promise.reject(errorData || error.message);
    }

    // 处理403权限不足
    if (error.response?.status === 403) {
      const message = isApiError(errorData)
        ? getUserFriendlyMessage(errorData)
        : '您没有权限执行此操作';
      toast.error(message);
      return Promise.reject(errorData || error.message);
    }

    // 处理400参数错误
    if (error.response?.status === 400) {
      const message = isApiError(errorData)
        ? getUserFriendlyMessage(errorData)
        : '请求参数不正确';
      toast.warning(message);
      return Promise.reject(errorData || error.message);
    }

    // 处理404资源不存在
    if (error.response?.status === 404) {
      const message = isApiError(errorData)
        ? getUserFriendlyMessage(errorData)
        : '请求的资源不存在';
      toast.error(message);
      return Promise.reject(errorData || error.message);
    }

    // 处理409资源冲突
    if (error.response?.status === 409) {
      const message = isApiError(errorData)
        ? getUserFriendlyMessage(errorData)
        : '数据已存在';
      toast.warning(message);
      return Promise.reject(errorData || error.message);
    }

    // 处理500服务器错误
    if (error.response?.status === 500) {
      const message = isApiError(errorData)
        ? getUserFriendlyMessage(errorData)
        : '服务器内部错误，请稍后重试';
      toast.error(message);
      return Promise.reject(errorData || error.message);
    }

    // 处理网络错误
    if (error.code === 'ECONNABORTED' || !error.response) {
      toast.error('网络连接超时，请检查网络后重试');
      return Promise.reject({ success: false, error: { code: 'NETWORK_ERROR', message: '网络连接超时' } });
    }

    // 其他错误
    toast.error('操作失败，请稍后重试');
    return Promise.reject(errorData || error.message);
  }
);

// 类型安全的 API 客户端封装
interface ApiClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const apiClient: ApiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.get(url, config) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.post(url, data, config) as unknown as Promise<T>,
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.put(url, data, config) as unknown as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.delete(url, config) as unknown as Promise<T>,
};

export default apiClient;

// 导出 axios 实例供特殊场景使用
export { axiosInstance };
