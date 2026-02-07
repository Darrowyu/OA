import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PdfPreviewProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

export function PdfPreview({ fileUrl, onClose }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // 检测是否为移动设备
  const isMobile = typeof window !== 'undefined' &&
    (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  useEffect(() => {
    loadPdf();
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (pdfDoc && !isRendering) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, pdfDoc]);

  const loadPdf = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loadingTask = pdfjsLib.getDocument({
        url: fileUrl,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setIsLoading(false);
    } catch (err) {
      console.error('PDF加载失败:', err);
      setError('PDF加载失败，请检查文件是否有效');
      setIsLoading(false);
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || isRendering) return;

    setIsRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // 获取设备像素比
      const devicePixelRatio = window.devicePixelRatio || 1;

      // 获取页面原始尺寸
      const viewport = page.getViewport({ scale: 1 });

      // 计算显示尺寸
      const containerWidth = canvas.parentElement?.clientWidth || viewport.width;
      const displayScale = Math.min((containerWidth - 32) / viewport.width, 2.5);
      const renderScale = displayScale * devicePixelRatio;

      // 获取渲染视口
      const renderViewport = page.getViewport({ scale: renderScale });
      const displayViewport = page.getViewport({ scale: displayScale });

      // 设置canvas尺寸
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;

      // 清除画布
      context.clearRect(0, 0, canvas.width, canvas.height);

      // 渲染页面
      const renderContext = {
        canvasContext: context,
        viewport: renderViewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('页面渲染失败:', err);
      setError('页面渲染失败');
    } finally {
      setIsRendering(false);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  // 触摸手势支持
  useEffect(() => {
    if (!isMobile || !canvasRef.current) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentPage < totalPages) {
          setCurrentPage(currentPage + 1);
        } else if (diff < 0 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      }
    };

    const canvas = canvasRef.current;
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, currentPage, totalPages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">正在加载PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <p>{error}</p>
        <button
          onClick={loadPdf}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm">
            第 {currentPage} 页，共 {totalPages} 页
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
          >
            缩小
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
          >
            放大
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              关闭
            </button>
          )}
        </div>
      </div>

      {/* PDF内容 */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          className="shadow-lg bg-white"
          style={{ maxWidth: '100%' }}
        />
      </div>

      {/* 移动端滑动提示 */}
      {isMobile && totalPages > 1 && (
        <div className="text-center py-2 text-sm text-gray-500 bg-gray-50">
          左右滑动切换页面
        </div>
      )}
    </div>
  );
}

export default PdfPreview;
