import { HardDrive, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { Folder } from '@/services/documents';

interface BreadcrumbNavProps {
  folderPath: Folder[];
  onNavigate: (folderId: string | null) => void;
}

/**
 * 面包屑导航组件
 */
export function BreadcrumbNav({ folderPath, onNavigate }: BreadcrumbNavProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer flex items-center"
            onClick={() => onNavigate(null)}
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
                onClick={() => onNavigate(folder.id)}
              >
                {folder.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default BreadcrumbNav;
