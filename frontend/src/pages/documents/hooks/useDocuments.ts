import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { folderApi, documentApi, type Folder, type Document } from '@/services/documents';

interface UseDocumentsReturn {
  folders: Folder[];
  documents: Document[];
  total: number;
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

/**
 * 文档数据Hook
 */
export function useDocuments(
  currentFolderId: string | null,
  page: number,
  pageSize: number
): UseDocumentsReturn {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [foldersRes, docsRes] = await Promise.all([
        folderApi.getSubFolders(currentFolderId),
        documentApi.getList({ page, pageSize, folderId: currentFolderId || undefined }),
      ]);

      if (foldersRes.success) {
        setFolders(foldersRes.data);
      }

      if (docsRes.success) {
        setDocuments(docsRes.data.data);
        setTotal(docsRes.data.total);
      }
    } catch {
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { folders, documents, total, isLoading, fetchData };
}

interface UseDocumentActionsReturn {
  downloadDocument: (doc: Document) => Promise<void>;
  renameDocument: (id: string, name: string) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
}

/**
 * 文档操作Hook
 */
export function useDocumentActions(onSuccess: () => void): UseDocumentActionsReturn {
  const downloadDocument = useCallback(async (doc: Document) => {
    try {
      const blob = await documentApi.download(doc.id) as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('下载已开始');
    } catch {
      toast.error('下载失败');
    }
  }, []);

  const renameDocument = useCallback(async (id: string, name: string) => {
    try {
      const res = await documentApi.rename(id, { name });
      if (res.success) {
        toast.success('重命名成功');
        onSuccess();
        return true;
      }
      return false;
    } catch {
      toast.error('重命名失败');
      return false;
    }
  }, [onSuccess]);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const res = await documentApi.delete(id);
      if (res.success) {
        toast.success('已移至回收站');
        onSuccess();
        return true;
      }
      return false;
    } catch {
      toast.error('删除失败');
      return false;
    }
  }, [onSuccess]);

  return { downloadDocument, renameDocument, deleteDocument };
}

export default { useDocuments, useDocumentActions };
