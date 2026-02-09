import { useState, useCallback, useMemo } from 'react';

// 分页配置
interface PaginationConfig {
  total: number;
  pageSize?: number;
  defaultPage?: number;
}

// 分页返回值
interface UsePaginationReturn {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canNextPage: boolean;
  canPrevPage: boolean;
  pageRange: number[];
}

/**
 * 分页逻辑Hook
 */
export function usePagination({
  total: initialTotal,
  pageSize = 10,
  defaultPage = 1,
}: PaginationConfig): UsePaginationReturn {
  const [page, setPageState] = useState(defaultPage);
  const [currentPageSize, setPageSizeState] = useState(pageSize);
  const [total, setTotalState] = useState(initialTotal);

  // 计算总页数
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / currentPageSize)),
    [total, currentPageSize]
  );

  // 确保当前页在有效范围内
  const setPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages));
      setPageState(validPage);
    },
    [totalPages]
  );

  // 设置每页条数（同时重置到第一页）
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  // 设置总数
  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal);
  }, []);

  // 下一页
  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  // 上一页
  const prevPage = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);

  // 是否可以翻页
  const canNextPage = page < totalPages;
  const canPrevPage = page > 1;

  // 计算显示的页码范围（简化版）
  const pageRange = useMemo(() => {
    const pages: number[] = [];
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  return {
    page,
    pageSize: currentPageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
    pageRange,
  };
}

export type { PaginationConfig, UsePaginationReturn };
