import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const [jumpPage, setJumpPage] = useState(currentPage.toString())

  useEffect(() => {
    setJumpPage(currentPage.toString())
  }, [currentPage])

  const handleJump = () => {
    const page = parseInt(jumpPage, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJump()
    }
  }

  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>每页显示</span>
        <NativeSelect
          value={pageSize.toString()}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          options={pageSizeOptions.map((size) => ({
            value: size.toString(),
            label: `${size}条`,
          }))}
          className="w-20 h-8"
        />
        <span>共 {total} 条记录</span>
        <span className="text-muted-foreground">
          (第 {startItem}-{endItem} 条)
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          第 {currentPage} / {totalPages} 页
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm text-muted-foreground">跳至</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 w-16 text-center"
          />
          <span className="text-sm text-muted-foreground">页</span>
          <Button variant="outline" size="sm" className="h-8" onClick={handleJump}>
            跳转
          </Button>
        </div>
      </div>
    </div>
  )
}
