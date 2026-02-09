import { useState, useCallback, useMemo } from 'react';

// 分页配置
interface PaginationConfig {
  total: number;
  pageSize?: number;
  defaultPage?: number;
  siblingCount?: number;
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
  firstPage: () => void;
  lastPage: () => void;
  canNextPage: boolean;
  canPrevPage: boolean;
  pageRange: (number | 'ellipsis')[];
  startIndex: number;
  endIndex: number;
  getPaginationParams: () => { page: number; pageSize: number };
  reset: () => void;
}

/**
 * 分页逻辑Hook
 *
 * 管理分页状态，提供页码计算和跳转功能
 *
 * @example
 * ```tsx
 * const pagination = usePagination({ total: 100, pageSize: 10 });
 *
 * // 使用分页信息获取数据
 * const { data } = useApi(() => fetchData(pagination.page, pagination.pageSize), {
 *   immediate: true,
 * });
 *
 * // 渲染页码
 * {pagination.pageRange.map((page, index) => (
 *   page === 'ellipsis' ? (
 *     <span key={`ellipsis-${index}`}>...</span>
 *   ) : (
 *     <Button
 *       key={page}
 *       variant={pagination.page === page ? 'default' : 'outline'}
 *       onClick={() => pagination.setPage(page)}
 *     >
 *       {page}
 *     </Button>
 *   )
 * ))}
 * ```
 */
export function usePagination({
  total: initialTotal,
  pageSize = 10,
  defaultPage = 1,
  siblingCount = 1,
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

  // 第一页
  const firstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  // 最后一页
  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [setPage, totalPages]);

  // 是否可以翻页
  const canNextPage = page < totalPages;
  const canPrevPage = page > 1;

  // 计算当前页的数据范围
  const startIndex = useMemo(
    () => (page - 1) * currentPageSize,
    [page, currentPageSize]
  );
  const endIndex = useMemo(
    () => Math.min(startIndex + currentPageSize - 1, total - 1),
    [startIndex, currentPageSize, total]
  );

  // 计算显示的页码范围（包含省略号逻辑）
  const pageRange = useMemo<(number | 'ellipsis')[]>(() => {
    const range: (number | 'ellipsis')[] = [];

    // 简单情况：页数较少，全部显示
    if (totalPages <= 5 + siblingCount * 2) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
      return range;
    }

    // 计算显示范围
    let startPage = Math.max(2, page - siblingCount);
    let endPage = Math.min(totalPages - 1, page + siblingCount);

    // 调整范围以确保显示足够的页码
    const leftSiblingCount = page - startPage;
    const rightSiblingCount = endPage - page;

    if (leftSiblingCount < siblingCount) {
      endPage = Math.min(totalPages - 1, endPage + (siblingCount - leftSiblingCount));
    }
    if (rightSiblingCount < siblingCount) {
      startPage = Math.max(2, startPage - (siblingCount - rightSiblingCount));
    }

    // 第一页
    range.push(1);

    // 左侧省略号
    if (startPage > 2) {
      range.push('ellipsis');
    } else if (startPage === 2) {
      range.push(2);
    }

    // 中间页码
    for (let i = Math.max(2, startPage); i <= Math.min(totalPages - 1, endPage); i++) {
      if (!range.includes(i)) {
        range.push(i);
      }
    }

    // 右侧省略号
    if (endPage < totalPages - 1) {
      range.push('ellipsis');
    } else if (endPage === totalPages - 1) {
      range.push(totalPages - 1);
    }

    // 最后一页
    if (totalPages > 1 && !range.includes(totalPages)) {
      range.push(totalPages);
    }

    return range;
  }, [page, totalPages, siblingCount]);

  // 获取分页参数（向后兼容）
  const getPaginationParams = useCallback(
    () => ({
      page,
      pageSize: currentPageSize,
    }),
    [page, currentPageSize]
  );

  // 重置
  const reset = useCallback(() => {
    setPageState(defaultPage);
    setPageSizeState(pageSize);
    setTotalState(0);
  }, [defaultPage, pageSize]);

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
    firstPage,
    lastPage,
    canNextPage,
    canPrevPage,
    pageRange,
    startIndex,
    endIndex,
    getPaginationParams,
    reset,
  };
}

// 为了保持向后兼容，提供旧的调用方式
interface LegacyPaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface LegacyUsePaginationReturn {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
  getPaginationParams: () => { page: number; pageSize: number };
}

/**
 * 旧版分页Hook（向后兼容）
 * @deprecated 请使用新的对象参数形式 usePagination({ total: 0 })
 */
export function usePaginationLegacy(
  initialPage: number = 1,
  initialPageSize: number = 20
): LegacyUsePaginationReturn {
  const [state, setState] = useState<LegacyPaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });

  const totalPages = Math.ceil(state.total / state.pageSize) || 1;

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setTotal = useCallback((total: number) => {
    setState((prev) => ({ ...prev, total }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const reset = useCallback(() => {
    setState({
      page: initialPage,
      pageSize: initialPageSize,
      total: 0,
    });
  }, [initialPage, initialPageSize]);

  const getPaginationParams = useCallback(
    () => ({
      page: state.page,
      pageSize: state.pageSize,
    }),
    [state.page, state.pageSize]
  );

  return {
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    totalPages,
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    prevPage,
    reset,
    getPaginationParams,
  };
}

// 为了保持向后兼容，导出默认的usePagination
export default usePagination;

// 导出类型
export type { PaginationConfig, UsePaginationReturn, LegacyUsePaginationReturn };
