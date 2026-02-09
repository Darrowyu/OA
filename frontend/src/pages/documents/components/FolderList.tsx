import { motion } from 'framer-motion';
import { Folder as FolderIcon } from 'lucide-react';
import type { Folder } from '@/services/documents';

interface FolderListProps {
  folders: Folder[];
  viewMode: 'grid' | 'list';
  onFolderClick: (folderId: string) => void;
}

/**
 * 文件夹列表组件
 */
export function FolderList({ folders, viewMode, onFolderClick }: FolderListProps) {
  if (folders.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">文件夹</h3>
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-2'}>
        {folders.map((folder) => (
          <motion.div
            key={folder.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => onFolderClick(folder.id)}
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
  );
}

export default FolderList;
