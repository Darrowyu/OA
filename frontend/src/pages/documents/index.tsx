import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FolderOpen, Search, List, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { FolderManager } from './FolderManager';
import { DocumentViewer } from './DocumentViewer';
import { useDocuments, useDocumentActions } from './hooks/useDocuments';
import { FolderList } from './components/FolderList';
import { DocumentList } from './components/DocumentList';
import { BreadcrumbNav } from './components/BreadcrumbNav';
import { documentApi, isPreviewable, type Document, type Folder } from '@/services/documents';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [page, setPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);

  const { folders, documents, total, isLoading, fetchData } = useDocuments(
    currentFolderId,
    page,
    20
  );

  const { downloadDocument, renameDocument, deleteDocument } = useDocumentActions(fetchData);

  // 过滤文档
  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleFolderClick = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
    setPage(1);
  }, []);

  const handleBreadcrumbClick = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setPage(1);
    if (!folderId) {
      setFolderPath([]);
    }
  }, []);

  const handlePreview = useCallback((doc: Document) => {
    if (isPreviewable(doc.type)) {
      setSelectedDocument(doc);
      setIsViewerOpen(true);
    } else {
      toast.info('该文件类型暂不支持预览');
    }
  }, []);

  const handleRename = useCallback(
    async (doc: Document, newName: string) => {
      await renameDocument(doc.id, newName);
    },
    [renameDocument]
  );

  const handleDelete = useCallback(
    async (doc: Document) => {
      await deleteDocument(doc.id);
    },
    [deleteDocument]
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!currentFolderId) {
        toast.error('请先选择一个文件夹');
        return;
      }

      try {
        await documentApi.upload(file, currentFolderId);
        toast.success('文件上传成功');
        fetchData();
      } catch {
        toast.error('文件上传失败');
      }

      event.target.value = '';
    },
    [currentFolderId, fetchData]
  );

  return (
    <>
      <Header />
      <motion.main
        className="p-4 md:p-6 min-h-[calc(100vh-4rem)] bg-gray-50"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 页面标题 */}
        <motion.div className="mb-6" variants={itemVariants}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">文档中心</h1>
              <p className="text-gray-500 mt-1">管理您的文件和文件夹</p>
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
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* 面包屑导航 */}
        <motion.div className="mb-4" variants={itemVariants}>
          <BreadcrumbNav folderPath={folderPath} onNavigate={handleBreadcrumbClick} />
        </motion.div>

        {/* 搜索和工具栏 */}
        <motion.div className="bg-white rounded-lg border p-4 mb-4" variants={itemVariants}>
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
        </motion.div>

        {/* 文件夹列表 */}
        <motion.div variants={itemVariants}>
          <FolderList folders={folders} viewMode={viewMode} onFolderClick={handleFolderClick} />
        </motion.div>

        {/* 文档列表 */}
        <motion.div className="bg-white rounded-lg border" variants={itemVariants}>
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium text-gray-700">文件列表 ({total})</h3>
          </div>
          <DocumentList
            documents={filteredDocuments}
            viewMode={viewMode}
            isLoading={isLoading}
            onPreview={handlePreview}
            onDownload={downloadDocument}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </motion.div>

        {/* 分页 */}
        {total > 20 && (
          <motion.div className="flex items-center justify-between mt-4" variants={itemVariants}>
            <p className="text-sm text-gray-500">
              显示 {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} 共 {total} 个
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
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </motion.div>
        )}

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
      </motion.main>
    </>
  );
}
