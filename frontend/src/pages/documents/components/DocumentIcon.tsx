import { FileText } from 'lucide-react';
import { getDocumentColor, type DocumentType } from '@/services/documents';

interface DocumentIconProps {
  type: DocumentType;
  className?: string;
}

/**
 * 文件类型图标组件
 */
export function DocumentIcon({ type, className = 'w-8 h-8' }: DocumentIconProps) {
  const colorClass = getDocumentColor(type);
  return <FileText className={`${className} ${colorClass}`} />;
}

export default DocumentIcon;
