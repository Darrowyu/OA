// API相关hooks
export {
  useApi,
  useCachedApi,
  usePollingApi,
} from './useApi';
export type {
  ApiStatus,
  UseApiReturn,
  UseApiOptions,
} from './useApi';

// 分页相关hooks
export {
  usePagination,
  usePaginationLegacy,
} from './usePagination';
export type {
  PaginationConfig,
  UsePaginationReturn,
  LegacyUsePaginationReturn,
} from './usePagination';

// 防抖相关hooks
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedState,
  useDebouncedAsync,
} from './useDebounce';
export type {
  DebounceOptions,
} from './useDebounce';

// 其他hooks保持原有导出
export { useSignature } from './useSignature';
export { useProfile } from './useProfile';
export { useNotifications } from './useNotifications';
export { useIsMobile } from './use-mobile';
