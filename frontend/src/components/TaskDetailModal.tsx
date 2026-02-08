import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, Link2, User, Tag, CheckCircle2, Calendar, Flame, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
}

const priorityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
}

// Parse @mentions in text
const parseMentions = (text: string) => {
  const mentionRegex = /@(\w+)/g
  const parts = text.split(mentionRegex)

  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // This is a mention
      return (
        <span key={index} className="text-blue-500 hover:underline cursor-pointer">
          @{part}
        </span>
      )
    }
    return part
  })
}

export function TaskDetailModal({ isOpen, onClose }: TaskDetailModalProps) {
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState([
    {
      id: "1",
      user: { id: "1", name: "赵小美", avatar: "" },
      content: "这个需求需要再确认一下，@李总监 麻烦看一下",
      timestamp: "2小时前",
      attachments: [
        { id: "1", name: "需求文档v2.0.docx", size: "2.5 MB", type: "doc" },
      ],
    },
    {
      id: "2",
      user: { id: "2", name: "李总监", avatar: "" },
      content: "已确认，可以按这个方案进行开发",
      timestamp: "1小时前",
    },
  ])

  const handleSaveComment = () => {
    if (!newComment.trim()) return

    const comment = {
      id: Date.now().toString(),
      user: { id: "3", name: "张经理", avatar: "" },
      content: newComment,
      timestamp: "刚刚",
    }

    setComments([...comments, comment])
    setNewComment("")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative bg-white rounded-2xl w-full max-w-[600px] max-h-[80vh] overflow-hidden shadow-2xl mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">OA系统功能优化</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Star className="h-4 w-4 text-gray-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Link2 className="h-4 w-4 text-gray-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {/* Task Fields */}
              <div className="space-y-4 mb-6">
                {/* Assignee */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    负责人
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {["赵小美", "周开发"].map((name) => (
                      <Badge key={name} variant="secondary" className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700"
                      >
                        <Avatar className="w-4 h-4"><AvatarFallback className="text-[8px] bg-blue-200">{name.charAt(0)}</AvatarFallback></Avatar>
                        {name}
                        <X className="h-3 w-3 cursor-pointer" />
                      </Badge>
                    ))}
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <Tag className="h-4 w-4" />
                    标签
                  </div>
                  <div className="flex items-center gap-2">
                    {["OA系统", "功能优化"].map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-700">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 className="h-4 w-4" />
                    状态
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border-2 border-gray-400" />
                    <span className="text-sm text-gray-700">进行中</span>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    截止日期
                  </div>
                  <span className="text-sm text-gray-700">2024年2月15日</span>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <Flame className="h-4 w-4" />
                    优先级
                  </div>
                  <Badge className={priorityStyles.high}>
                    {priorityLabels.high}
                  </Badge>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value="comment" className="w-full">
                <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-lg mb-4">
                  <TabsTrigger value="description" className="text-sm">描述</TabsTrigger>
                  <TabsTrigger value="comment" className="text-sm">评论</TabsTrigger>
                  <TabsTrigger value="setting" className="text-sm">设置</TabsTrigger>
                </TabsList>

                <TabsContent value="comment" className="mt-0">
                  {/* Comments */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                            {comment.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">{comment.user.name}</span>
                            <span className="text-xs text-gray-400">{comment.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{parseMentions(comment.content)}</p>

                          {/* Attachments */}
                          {comment.attachments && comment.attachments.map((attachment: any) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2"
                            >
                              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                                <FileText className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{attachment.name}</p>
                                <p className="text-xs text-gray-400">{attachment.size}</p>
                              </div>
                            </div>
                          ))}

                          {/* Actions */}
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <button className="hover:text-gray-600">回复</button>
                            <button className="hover:text-gray-600">点赞</button>
                            <button className="hover:text-gray-600">删除</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* New Comment Input */}
                  <div className="mt-4 flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">张</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        placeholder="添加评论..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full mb-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSaveComment()
                          }
                        }}
                      />
                      {newComment && (
                        <p className="text-sm text-gray-600">
                          {parseMentions(newComment)}
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="description" className="mt-0">
                  <p className="text-sm text-gray-500">暂无描述</p>
                </TabsContent>

                <TabsContent value="setting" className="mt-0">
                  <p className="text-sm text-gray-500">设置内容...</p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">协作者</span>
                <div className="flex -space-x-2">
                  {["赵小美", "周开发", "孙测试"].map((name, idx) => (
                    <Avatar key={idx} className="w-7 h-7 border border-white">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-[10px]">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  取消
                </Button>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white" onClick={handleSaveComment}>
                  保存
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
