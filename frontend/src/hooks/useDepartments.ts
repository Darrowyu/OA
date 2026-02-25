import { useState, useEffect } from 'react';
import { departmentApi } from '@/services/departments';
import type { Department } from '@/services/departments';

interface UseDepartmentsReturn {
  data?: Department[];
  isLoading: boolean;
  error?: Error;
}

export function useDepartments(): UseDepartmentsReturn {
  const [data, setData] = useState<Department[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        const response = await departmentApi.getDepartments();
        setData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch departments'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return { data, isLoading, error };
}

export function useDepartmentTree(): UseDepartmentsReturn {
  const [data, setData] = useState<Department[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const fetchDepartmentTree = async () => {
      try {
        setIsLoading(true);
        const response = await departmentApi.getDepartmentTree();
        // 将树结构扁平化
        const flattenTree = (nodes: Department[]): Department[] => {
          const result: Department[] = [];
          const traverse = (node: Department) => {
            result.push(node);
            if (node.children) {
              node.children.forEach(traverse);
            }
          };
          nodes.forEach(traverse);
          return result;
        };
        setData(flattenTree(response.data as Department[]));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch department tree'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartmentTree();
  }, []);

  return { data, isLoading, error };
}
