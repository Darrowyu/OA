import { motion } from 'framer-motion';
import { Clock, MoreVertical, Eye, Download, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentIcon } from './DocumentIcon';
import { formatFileSize, type Document } from '@/services/documents';

interface DocumentListProps {
  documents: Document[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onPreview: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onRename: (doc: Document, newName: string) => void;
  onDelete: (doc: Document) => void;
}

/**
 * 文档列表组件
 */
export function DocumentList({
  documents,
  viewMode,
  isLoading,
  onPreview,
  onDownload,
  onRename,
  onDelete,
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" />
        加载中...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="text-6xl mb-4">📄</div>
        <p className="text-lg font-medium">暂无文件</p>
        <p className="text-sm mt-1">点击上方"上传文件"按钮添加文件</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            whileHover={{ scale: 1.02 }}
            className="group relative flex flex-col items-center p-4 rounded-lg border hover:shadow-md transition-shadow"
          >
            <DocumentIcon type={doc.type} className="w-16 h-16 mb-3" />
            <span className="text-sm font-medium text-gray-700 text-center truncate w-full">{doc.name}</span>
            <span className="text-xs text-gray-500 mt-1">{formatFileSize(doc.size)}</span>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onPreview(doc)}>
                    <Eye className="w-4 h-4 mr-2" />
                    预览
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload(doc)}>
                    <Download className="w-4 h-4 mr-2" />
                    下载
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onRename(doc, doc.name)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    重命名
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => onDelete(doc)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
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
            <Button variant="ghost" size="sm" onClick={() => onPreview(doc)}>
              <Eye className="w-4 h-4 mr-1" />
              预览
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDownload(doc)}>
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
                <DropdownMenuItem onClick={() => onRename(doc, doc.name)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  重命名
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={() => onDelete(doc)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default DocumentList;
