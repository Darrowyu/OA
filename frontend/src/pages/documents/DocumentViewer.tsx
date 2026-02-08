import { useEffect, useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { documentApi, type Document, type DocumentVersion } from '@/services/documents';
import { formatFileSize } from '@/services/documents';
import { toast } from 'sonner';

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    if (isOpen && document) {
      loadPreview();
      loadVersions();
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    };
  }, [isOpen, document]);

  const loadPreview = async () => {
    if (!document) return;

    // 只有可预览类型才加载
    const previewableTypes = ['PDF', 'JPG', 'JPEG', 'PNG', 'GIF', 'TXT'];
    if (!previewableTypes.includes(document.type)) {
      return;
    }

    setLoading(true);
    try {
      const blob = await documentApi.preview(document.id) as unknown as Blob;
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      toast.error('加载预览失败');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    if (!document) return;

    try {
      const res = await documentApi.getVersions(document.id);
      if (res.success) {
        setVersions(res.data);
      }
    } catch (error) {
      console.error('加载版本历史失败', error);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const blob = await documentApi.download(document.id) as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('下载已开始');
    } catch (error) {
      toast.error('下载失败');
    }
  };

  const renderPreview = () => {
    if (!document) return null;

    if (loading) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
          <FileText className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">该文件类型暂不支持预览</p>
          <p className="text-sm mt-1">请下载后查看</p>
          <Button className="mt-4" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            下载文件
          </Button>
        </div>
      );
    }

    // 根据文件类型渲染不同的预览
    if (document.type === 'PDF') {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh] border-0"
          title={document.name}
        />
      );
    }

    if (['JPG', 'JPEG', 'PNG', 'GIF'].includes(document.type)) {
      return (
        <div className="flex items-center justify-center h-[70vh] bg-gray-100">
          <img
            src={previewUrl}
            alt={document.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    if (document.type === 'TXT') {
      return (
        <div className="h-[70vh] overflow-auto p-4 bg-gray-50">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0 bg-white"
            title={document.name}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <FileText className="w-16 h-16 mb-4 text-gray-300" />
        <p>无法预览此文件类型</p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-500" />
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {document?.name}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {document && formatFileSize(document.size)} · 版本 {document?.version}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="preview">文件预览</TabsTrigger>
            <TabsTrigger value="versions">版本历史</TabsTrigger>
            <TabsTrigger value="info">文件信息</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 m-0 px-6 pb-6 overflow-hidden">
            {renderPreview()}
          </TabsContent>

          <TabsContent value="versions" className="flex-1 m-0 px-6 pb-6 overflow-auto">
            {versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>暂无版本历史</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                        v{version.version}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {index === 0 ? '当前版本' : `版本 ${version.version}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(version.createdAt).toLocaleString()} · {formatFileSize(version.size)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="flex-1 m-0 px-6 pb-6 overflow-auto">
            {document && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">基本信息</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">文件名</span>
                      <span className="text-sm font-medium">{document.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">文件类型</span>
                      <span className="text-sm font-medium">{document.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">文件大小</span>
                      <span className="text-sm font-medium">{formatFileSize(document.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">当前版本</span>
                      <span className="text-sm font-medium">v{document.version}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">位置信息</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">所属文件夹</span>
                      <span className="text-sm font-medium">{document.folder.name}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">创建信息</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">上传者</span>
                      <span className="text-sm font-medium">{document.owner.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">创建时间</span>
                      <span className="text-sm font-medium">
                        {new Date(document.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">最后更新</span>
                      <span className="text-sm font-medium">
                        {new Date(document.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
