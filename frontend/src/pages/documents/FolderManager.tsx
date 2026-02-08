import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderPlus,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  folderApi,
  type FolderTreeNode,
} from '@/services/documents';
import { toast } from 'sonner';

interface FolderManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string) => void;
}

// 递归渲染文件夹树
function FolderTreeItem({
  folder,
  level = 0,
  onEdit,
  onDelete,
  onSelect,
  expandedFolders,
  toggleFolder,
}: {
  folder: FolderTreeNode;
  level?: number;
  onEdit: (folder: FolderTreeNode) => void;
  onDelete: (folder: FolderTreeNode) => void;
  onSelect: (folderId: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
}) {
  const isExpanded = expandedFolders.has(folder.id);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="group flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleFolder(folder.id);
          }}
          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 ${
            hasChildren ? '' : 'invisible'
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <div
          className="flex-1 flex items-center gap-2 min-w-0"
          onClick={() => onSelect(folder.id)}
        >
          <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {folder.name}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(folder)}>
              <Edit3 className="w-4 h-4 mr-2" />
              重命名
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDelete(folder)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {folder.children.map((child) => (
              <FolderTreeItem
                key={child.id}
                folder={child}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onSelect={onSelect}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FolderManager({ isOpen, onClose, onSelect }: FolderManagerProps) {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderTreeNode | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);

  const loadFolderTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await folderApi.getTree();
      if (res.data.success) {
        setFolderTree(res.data.data);
      }
    } catch (error) {
      toast.error('加载文件夹失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadFolderTree();
    }
  }, [isOpen, loadFolderTree]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }

    try {
      const res = await folderApi.create({
        name: newFolderName,
        parentId: parentFolderId,
      });
      if (res.data.success) {
        toast.success('文件夹创建成功');
        loadFolderTree();
        setIsCreateDialogOpen(false);
        setNewFolderName('');
        setParentFolderId(null);
      }
    } catch (error) {
      toast.error('创建文件夹失败');
    }
  };

  const handleEdit = async () => {
    if (!selectedFolder || !newFolderName.trim()) return;

    try {
      const res = await folderApi.update(selectedFolder.id, {
        name: newFolderName,
      });
      if (res.data.success) {
        toast.success('文件夹重命名成功');
        loadFolderTree();
        setIsEditDialogOpen(false);
        setNewFolderName('');
        setSelectedFolder(null);
      }
    } catch (error) {
      toast.error('重命名失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedFolder) return;

    try {
      const res = await folderApi.delete(selectedFolder.id);
      if (res.data.success) {
        toast.success('文件夹删除成功');
        loadFolderTree();
        setIsDeleteDialogOpen(false);
        setSelectedFolder(null);
      }
    } catch (error) {
      toast.error('删除失败，请确保文件夹为空');
    }
  };

  const handleSelectFolder = (folderId: string) => {
    onSelect(folderId);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>文件夹管理</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              管理您的文件夹结构，点击文件夹可快速跳转
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-lg my-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full" />
              </div>
            ) : folderTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <Folder className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm">暂无文件夹</p>
                <p className="text-xs mt-1">点击下方按钮创建</p>
              </div>
            ) : (
              <div className="p-2">
                {folderTree.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    onEdit={(f) => {
                      setSelectedFolder(f);
                      setNewFolderName(f.name);
                      setIsEditDialogOpen(true);
                    }}
                    onDelete={(f) => {
                      setSelectedFolder(f);
                      setIsDeleteDialogOpen(true);
                    }}
                    onSelect={handleSelectFolder}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setParentFolderId(null);
                setNewFolderName('');
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              新建文件夹
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建文件夹对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
            <DialogDescription>
              {parentFolderId
                ? '在选中文件夹下创建子文件夹'
                : '在根目录创建文件夹'}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑文件夹对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名文件夹</DialogTitle>
            <DialogDescription>请输入新的文件夹名称</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除文件夹 "{selectedFolder?.name}" 吗？此操作不可恢复，且只能删除空文件夹。
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
    </>
  );
}
