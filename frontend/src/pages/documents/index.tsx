import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder as FolderIcon,
  FileText,
  MoreVertical,
  Upload,
  Search,
  Grid,
  List,
  ChevronRight,
  Download,
  Trash2,
  Edit3,
  Eye,
  Clock,
  HardDrive,
  File,
  FolderOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  folderApi,
  documentApi,
  type Folder,
  type Document,
  type DocumentType,
  formatFileSize,
  getDocumentColor,
  isPreviewable,
} from '@/services/documents';
import { Header } from '@/components/Header';
import { DocumentViewer } from './DocumentViewer';
import { FolderManager } from './FolderManager';
import { toast } from 'sonner';

// 文件类型图标组件
function DocumentIcon({ type, className = 'w-8 h-8' }: { type: DocumentType; className?: string }) {
  const colorClass = getDocumentColor(type);

  if (type === 'PDF') {
    return <FileText className={`${className} ${colorClass}`} />;
  }
  if (['DOC', 'DOCX'].includes(type)) {
    return <FileText className={`${className} ${colorClass}`} />;
  }
  if (['XLS', 'XLSX'].includes(type)) {
    return <FileText className={`${className} ${colorClass}`} />;
  }
  if (['JPG', 'JPEG', 'PNG', 'GIF'].includes(type)) {
    return <FileText className={`${className} ${colorClass}`} />;
  }
  if (['ZIP', 'RAR'].includes(type)) {
    return <FileText className={`${className} ${colorClass}`} />;
  }

  return <File className={`${className} text-gray-500`} />;
}

// 上传进度条
function UploadProgress({ fileName, progress, onCancel }: { fileName: string; progress: number; onCancel: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate flex-1">{fileName}</span>
        <button onClick={onCancel} className="ml-2 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 mt-1">{progress}%</span>
    </div>
  );
}

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number } | null>(null);
  const [statistics, setStatistics] = useState({ totalDocuments: 0, totalSize: 0 });

  // 加载文件夹和文档
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, docsRes, statsRes] = await Promise.all([
        folderApi.getSubFolders(currentFolderId),
        documentApi.getList({ page, pageSize, folderId: currentFolderId || undefined }),
        documentApi.getStatistics(),
      ]);

      if (foldersRes.success) {
        setFolders(foldersRes.data);
      }

      if (docsRes.success) {
        setDocuments(docsRes.data.data);
        setTotalDocuments(docsRes.data.total);
      }

      if (statsRes.success) {
        setStatistics(statsRes.data);
      }
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, page, pageSize]);

  // 加载文件夹路径
  const loadFolderPath = useCallback(async () => {
    if (!currentFolderId) {
      setFolderPath([]);
      return;
    }

    try {
      const res = await folderApi.getById(currentFolderId);
      if (res.success && res.data.parentId) {
        // 这里简化处理，实际应该递归加载完整路径
        setFolderPath([res.data]);
      }
    } catch (error) {
      console.error('加载文件夹路径失败', error);
    }
  }, [currentFolderId]);

  useEffect(() => {
    loadData();
    loadFolderPath();
  }, [loadData, loadFolderPath]);

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!currentFolderId) {
      toast.error('请先选择一个文件夹');
      return;
    }

    setUploadProgress({ fileName: file.name, progress: 0 });

    try {
      const res = await documentApi.upload(file, currentFolderId, (progress) => {
        setUploadProgress({ fileName: file.name, progress });
      });

      if (res.success) {
        toast.success('文件上传成功');
        loadData();
      }
    } catch (error) {
      toast.error('文件上传失败');
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
    }

    // 重置input
    event.target.value = '';
  };

  // 处理文件夹点击
  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setPage(1);
  };

  // 处理面包屑导航
  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setPage(1);
  };

  // 处理文档预览
  const handlePreview = (doc: Document) => {
    if (isPreviewable(doc.type)) {
      setSelectedDocument(doc);
      setIsViewerOpen(true);
    } else {
      toast.info('该文件类型暂不支持预览');
    }
  };

  // 处理文档下载
  const handleDownload = async (doc: Document) => {
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
    } catch (error) {
      toast.error('下载失败');
    }
  };

  // 处理重命名
  const handleRename = async () => {
    if (!selectedDocument || !newName.trim()) return;

    try {
      const res = await documentApi.rename(selectedDocument.id, { name: newName });
      if (res.success) {
        toast.success('重命名成功');
        loadData();
        setIsRenameDialogOpen(false);
        setNewName('');
      }
    } catch (error) {
      toast.error('重命名失败');
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      const res = await documentApi.delete(selectedDocument.id);
      if (res.success) {
        toast.success('已移至回收站');
        loadData();
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        {/* 页面标题和统计 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">文档中心</h1>
              <p className="text-gray-500 mt-1">
                共 {statistics.totalDocuments} 个文件 · {formatFileSize(statistics.totalSize)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsFolderManagerOpen(true)}>
                <FolderOpen className="w-4 h-4 mr-2" />
                管理文件夹
              </Button>
              <Button className="bg-gray-900 hover:bg-gray-800">
                <label className="flex items-center cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  上传文件
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
            </div>
          </div>
        </div>

        {/* 面包屑导航 */}
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer flex items-center"
                  onClick={() => handleBreadcrumbClick(null)}
                >
                  <HardDrive className="w-4 h-4 mr-1" />
                  全部文件
                </BreadcrumbLink>
              </BreadcrumbItem>
              {folderPath.map((folder) => (
                <div key={folder.id} className="flex items-center">
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => handleBreadcrumbClick(folder.id)}
                    >
                      {folder.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* 搜索和工具栏 */}
        <div className="bg-white rounded-lg border p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 文件夹列表 */}
        {folders.length > 0 && (
          <div className="bg-white rounded-lg border p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">文件夹</h3>
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-2'}>
              {folders.map((folder) => (
                <motion.div
                  key={folder.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleFolderClick(folder.id)}
                  className={`cursor-pointer group ${
                    viewMode === 'grid'
                      ? 'flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50'
                      : 'flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50'
                  }`}
                >
                  <FolderIcon className={`${viewMode === 'grid' ? 'w-12 h-12' : 'w-8 h-8'} text-yellow-500`} />
                  <span className={`text-sm font-medium text-gray-700 truncate ${viewMode === 'grid' ? 'mt-2 text-center w-full' : ''}`}>
                    {folder.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 文档列表 */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium text-gray-700">
              文件列表 ({totalDocuments})
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" />
              加载中...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">暂无文件</p>
              <p className="text-sm mt-1">点击上方"上传文件"按钮添加文件</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  whileHover={{ scale: 1.02 }}
                  className="group relative flex flex-col items-center p-4 rounded-lg border hover:shadow-md transition-shadow"
                >
                  <DocumentIcon type={doc.type} className="w-16 h-16 mb-3" />
                  <span className="text-sm font-medium text-gray-700 text-center truncate w-full">
                    {doc.name}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">{formatFileSize(doc.size)}</span>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(doc)}>
                          <Eye className="w-4 h-4 mr-2" />
                          预览
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedDocument(doc);
                            setNewName(doc.name);
                            setIsRenameDialogOpen(true);
                          }}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 group"
                >
                  <DocumentIcon type={doc.type} className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>·</span>
                      <span>{doc.type}</span>
                      <span>·</span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)}>
                      <Eye className="w-4 h-4 mr-1" />
                      预览
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedDocument(doc);
                            setNewName(doc.name);
                            setIsRenameDialogOpen(true);
                          }}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalDocuments > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalDocuments)} 共 {totalDocuments} 个
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= totalDocuments}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 上传进度 */}
        <AnimatePresence>
          {uploadProgress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <UploadProgress
                fileName={uploadProgress.fileName}
                progress={uploadProgress.progress}
                onCancel={() => setUploadProgress(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 文档预览 */}
        <DocumentViewer
          document={selectedDocument}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedDocument(null);
          }}
        />

        {/* 文件夹管理 */}
        <FolderManager
          isOpen={isFolderManagerOpen}
          onClose={() => setIsFolderManagerOpen(false)}
          onSelect={handleFolderClick}
        />

        {/* 重命名对话框 */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>重命名文件</DialogTitle>
              <DialogDescription>
                请输入新的文件名
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="文件名"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleRename}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除文件 "{selectedDocument?.name}" 吗？删除后文件将进入回收站。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
