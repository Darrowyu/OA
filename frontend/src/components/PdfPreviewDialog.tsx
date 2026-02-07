import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PdfPreview } from './PdfPreview';

interface PdfPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
}

export function PdfPreviewDialog({
  isOpen,
  onClose,
  fileUrl,
  fileName,
}: PdfPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {fileName || 'PDF预览'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <PdfPreview fileUrl={fileUrl} fileName={fileName} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PdfPreviewDialog;
