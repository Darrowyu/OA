import apiClient from '@/lib/api';

export type DocumentType = 'PDF' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'PPT' | 'PPTX' | 'TXT' | 'JPG' | 'JPEG' | 'PNG' | 'GIF' | 'ZIP' | 'RAR' | 'OTHER';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
}

export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderTreeNode[];
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  version: number;
  folderId: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  folder: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
    name: string;
  };
}

export interface DocumentVersion {
  id: string;
  version: number;
  size: number;
  createdBy: string;
  createdAt: string;
}

export interface DocumentStatistics {
  totalDocuments: number;
  totalSize: number;
  byType: Record<string, number>;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  folderId?: string;
  type?: DocumentType;
  keyword?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string | null;
}

export interface RenameDocumentRequest {
  name: string;
}

export interface MoveDocumentRequest {
  targetFolderId: string;
}

// 文件夹API
export const folderApi = {
  create: (data: CreateFolderRequest) =>
    apiClient.post<{ success: boolean; data: Folder; message: string }>('/documents/folders', data),

  getTree: () =>
    apiClient.get<{ success: boolean; data: FolderTreeNode[] }>('/documents/folders/tree'),

  getSubFolders: (parentId: string | null) =>
    apiClient.get<{ success: boolean; data: Folder[] }>(`/documents/folders/${parentId || 'root'}/subfolders`),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: Folder }>(`/documents/folders/${id}`),

  update: (id: string, data: Partial<CreateFolderRequest>) =>
    apiClient.put<{ success: boolean; data: Folder; message: string }>(`/documents/folders/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/documents/folders/${id}`),
};

// 文档API
export const documentApi = {
  getList: (params?: PaginationParams) =>
    apiClient.get<{ success: boolean; data: PaginatedResponse<Document> }>('/documents', { params }),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: Document }>(`/documents/${id}`),

  upload: (file: File, folderId: string, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);

    return apiClient.post<{ success: boolean; data: Document; message: string }>(
      '/documents',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }
    );
  },

  update: (id: string, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.put<{ success: boolean; data: Document; message: string }>(
      `/documents/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }
    );
  },

  rename: (id: string, data: RenameDocumentRequest) =>
    apiClient.put<{ success: boolean; message: string }>(`/documents/${id}/rename`, data),

  move: (id: string, data: MoveDocumentRequest) =>
    apiClient.put<{ success: boolean; message: string }>(`/documents/${id}/move`, data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/documents/${id}`),

  permanentlyDelete: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/documents/${id}/permanent`),

  getVersions: (id: string) =>
    apiClient.get<{ success: boolean; data: DocumentVersion[] }>(`/documents/${id}/versions`),

  download: (id: string) =>
    apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    }),

  preview: (id: string) =>
    apiClient.get(`/documents/${id}/preview`, {
      responseType: 'blob',
    }),

  getStatistics: () =>
    apiClient.get<{ success: boolean; data: DocumentStatistics }>('/documents/statistics'),
};

// 文件类型图标映射
export const getDocumentIcon = (type: DocumentType): string => {
  const iconMap: Record<string, string> = {
    'PDF': 'pdf',
    'DOC': 'word',
    'DOCX': 'word',
    'XLS': 'excel',
    'XLSX': 'excel',
    'PPT': 'powerpoint',
    'PPTX': 'powerpoint',
    'TXT': 'text',
    'JPG': 'image',
    'JPEG': 'image',
    'PNG': 'image',
    'GIF': 'image',
    'ZIP': 'archive',
    'RAR': 'archive',
    'OTHER': 'file',
  };
  return iconMap[type] || 'file';
};

// 文件类型颜色映射
export const getDocumentColor = (type: DocumentType): string => {
  const colorMap: Record<string, string> = {
    'PDF': 'text-red-500',
    'DOC': 'text-blue-500',
    'DOCX': 'text-blue-500',
    'XLS': 'text-green-500',
    'XLSX': 'text-green-500',
    'PPT': 'text-orange-500',
    'PPTX': 'text-orange-500',
    'TXT': 'text-gray-500',
    'JPG': 'text-purple-500',
    'JPEG': 'text-purple-500',
    'PNG': 'text-purple-500',
    'GIF': 'text-purple-500',
    'ZIP': 'text-yellow-500',
    'RAR': 'text-yellow-500',
    'OTHER': 'text-gray-500',
  };
  return colorMap[type] || 'text-gray-500';
};

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 检查文件是否可预览
export const isPreviewable = (type: DocumentType): boolean => {
  const previewableTypes: DocumentType[] = ['PDF', 'JPG', 'JPEG', 'PNG', 'GIF', 'TXT'];
  return previewableTypes.includes(type);
};
