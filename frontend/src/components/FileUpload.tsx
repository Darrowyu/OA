import * as React from "react"
import { uploadsApi, UploadResponse } from "@/services/uploads"
import { Upload, X, FileText, Loader2, Eye } from "lucide-react"
import { PdfPreviewDialog } from "./PdfPreviewDialog"

interface FileUploadProps {
  onUploadComplete: (files: UploadResponse[]) => void
  disabled?: boolean
  maxSize?: number // 最大文件大小，单位MB
  accept?: string // 接受的文件类型
  validateFileName?: boolean // 是否验证文件名格式
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: "uploading" | "success" | "error"
  error?: string
  result?: UploadResponse
}


export function FileUpload({
  onUploadComplete,
  disabled = false,
  maxSize = 10,
  accept = ".pdf",
  validateFileName = true,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [previewFile, setPreviewFile] = React.useState<{ url: string; name: string } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // 生成唯一ID
  const generateId = () => Math.random().toString(36).substring(2, 9)

  // 验证文件名格式（日期+中文）
  const validateFileNameFormat = (fileName: string): { valid: boolean; message?: string } => {
    if (!validateFileName) return { valid: true }

    // 移除扩展名
    const nameWithoutExt = fileName.replace(/\.pdf$/i, '')

    // 检查是否包含日期格式 (20250101 或 2025-01-01 或 2025/01/01)
    const datePattern = /(\d{4}[\-\/]?\d{2}[\-\/]?\d{2})/
    const hasDate = datePattern.test(nameWithoutExt)

    // 统计中文字符数量
    const chineseMatches = nameWithoutExt.match(/[\u4e00-\u9fa5]/g)
    const chineseCount = chineseMatches ? chineseMatches.length : 0

    if (!hasDate && chineseCount < 5) {
      return {
        valid: false,
        message: `文件名不符合规范：\n❌ 缺少日期（需要：20250101 或 2025-01-01）\n❌ 中文字符不足（当前${chineseCount}个，需要至少5个）\n\n正确示例：\n✅ xx公司模具报价单20250101.pdf\n✅ xx厂商报价明细2025-01-01.pdf`
      }
    }

    if (!hasDate) {
      return {
        valid: false,
        message: `文件名不符合规范：\n❌ 缺少日期（需要：20250101 或 2025-01-01）\n\n正确示例：\n✅ xx公司模具报价单20250101.pdf`
      }
    }

    if (chineseCount < 5) {
      return {
        valid: false,
        message: `文件名不符合规范：\n❌ 中文字符不足（当前${chineseCount}个，需要至少5个）\n\n正确示例：\n✅ xx公司模具报价单20250101.pdf`
      }
    }

    return { valid: true }
  }

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件类型
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return "仅支持PDF格式文件"
    }

    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      return `文件大小不能超过${maxSize}MB`
    }

    // 验证文件名格式
    const nameValidation = validateFileNameFormat(file.name)
    if (!nameValidation.valid) {
      return nameValidation.message || '文件名格式不正确'
    }

    return null
  }

  // 上传文件
  const uploadFile = async (uploadingFile: UploadingFile) => {
    const { file, id } = uploadingFile

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        )
      }, 200)

      const response = await uploadsApi.uploadFile(file)
      const uploadData = response.data || response

      clearInterval(progressInterval)

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, progress: 100, status: "success", result: uploadData }
            : f
        )
      )

      // 通知父组件
      onUploadComplete([uploadData])
    } catch (error) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "error", error: "上传失败" }
            : f
        )
      )
    }
  }

  // 处理文件选择
  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return

    const newFiles: UploadingFile[] = []

    Array.from(files).forEach((file) => {
      const error = validateFile(file)
      const id = generateId()

      if (error) {
        newFiles.push({
          id,
          file,
          progress: 0,
          status: "error",
          error,
        })
      } else {
        newFiles.push({
          id,
          file,
          progress: 0,
          status: "uploading",
        })
      }
    })

    setUploadingFiles((prev) => [...prev, ...newFiles])

    // 上传有效的文件
    newFiles
      .filter((f) => !f.error)
      .forEach((uploadingFile) => {
        uploadFile(uploadingFile)
      })
  }

  // 点击上传区域
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  // 文件输入变化
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // 清空input以便可以重复选择同一文件
    e.target.value = ""
  }

  // 拖拽事件
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  // 移除文件
  const handleRemove = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-3">
      {/* 拖拽上传区域 */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-1">
          <span className="font-medium text-blue-600">点击上传</span> 或拖拽文件到此处
        </p>
        <p className="text-xs text-gray-500">
          支持 PDF 格式，单个文件最大 {maxSize}MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          multiple
        />
      </div>

      {/* 上传文件列表 */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border
                ${file.status === "error" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}
              `}
            >
              {/* 文件图标 */}
              <div className="flex-shrink-0">
                {file.status === "uploading" ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : file.status === "error" ? (
                  <X className="h-5 w-5 text-red-500" />
                ) : (
                  <FileText className="h-5 w-5 text-green-500" />
                )}
              </div>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.file.size)}
                </p>

                {/* 进度条 */}
                {file.status === "uploading" && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{file.progress}%</p>
                  </div>
                )}

                {/* 错误信息 */}
                {file.status === "error" && file.error && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}

                {/* 成功信息 */}
                {file.status === "success" && (
                  <p className="text-xs text-green-600 mt-1">上传成功</p>
                )}
              </div>

              {/* 预览按钮 */}
              {file.status === "success" && file.result?.path && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewFile({
                      url: `/api/uploads/${file.result?.id}/preview`,
                      name: file.file.name
                    })
                  }}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                  title="预览"
                >
                  <Eye className="h-4 w-4 text-blue-500" />
                </button>
              )}

              {/* 删除按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(file.id)
                }}
                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={file.status === "uploading"}
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PDF预览对话框 */}
      {previewFile && (
        <PdfPreviewDialog
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
        />
      )}
    </div>
  )
}
