import * as React from "react";
import { CheckCircle2, Circle, ArrowRight, User, Users, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowNode {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface ApprovalFlowChartProps {
  type: "standard" | "other-director" | "other-ceo";
  className?: string;
}

const standardFlow: FlowNode[] = [
  {
    id: "factory",
    title: "厂长审批",
    description: "并行审批，需全部通过",
    icon: <Users className="h-4 w-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "director",
    title: "总监审批",
    description: "选择流向：经理/CEO/完成",
    icon: <User className="h-4 w-4" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "final",
    title: "最终审批",
    description: "经理或CEO审批",
    icon: <Crown className="h-4 w-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
];

const otherDirectorFlow: FlowNode[] = [
  {
    id: "submit",
    title: "提交申请",
    description: "直接提交给总监",
    icon: <Circle className="h-4 w-4" />,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  {
    id: "director",
    title: "总监审批",
    description: "审批后流程结束",
    icon: <User className="h-4 w-4" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "complete",
    title: "审批完成",
    description: "申请处理完毕",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
];

const otherCeoFlow: FlowNode[] = [
  {
    id: "submit",
    title: "提交申请",
    description: "直接提交给CEO",
    icon: <Circle className="h-4 w-4" />,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  {
    id: "ceo",
    title: "CEO审批",
    description: "审批后流程结束",
    icon: <Crown className="h-4 w-4" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    id: "complete",
    title: "审批完成",
    description: "申请处理完毕",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
];

export function ApprovalFlowChart({ type, className }: ApprovalFlowChartProps) {
  const nodes =
    type === "standard"
      ? standardFlow
      : type === "other-director"
      ? otherDirectorFlow
      : otherCeoFlow;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {nodes.map((node, index) => (
          <React.Fragment key={node.id}>
            {/* 节点 */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative flex items-center justify-center w-12 h-12 rounded-xl border-2 shadow-sm",
                  node.bgColor,
                  node.borderColor
                )}
              >
                <span className={node.color}>{node.icon}</span>
                {/* 步骤序号 */}
                <span
                  className={cn(
                    "absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center",
                    "bg-white border shadow-sm",
                    node.color,
                    node.borderColor
                  )}
                >
                  {index + 1}
                </span>
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">{node.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{node.description}</p>
              </div>
            </div>

            {/* 连接线 */}
            {index < nodes.length - 1 && (
              <div className="flex-1 flex items-center justify-center px-2 -mt-6">
                <div className="flex items-center gap-1">
                  <div className="h-0.5 w-8 bg-gradient-to-r from-gray-300 to-gray-400" />
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div className="h-0.5 w-8 bg-gradient-to-r from-gray-400 to-gray-300" />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

interface ApprovalFlowCardProps {
  type: "standard" | "other";
  targetLevel?: "DIRECTOR" | "CEO";
  className?: string;
}

export function ApprovalFlowCard({
  type,
  targetLevel,
  className,
}: ApprovalFlowCardProps) {
  if (type === "standard") {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5",
          className
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500 rounded-lg shadow-md">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">标准审批流程</h3>
            <p className="text-xs text-gray-600">多级审批，逐级流转</p>
          </div>
        </div>
        <ApprovalFlowChart type="standard" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 p-5",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-500 rounded-lg shadow-md">
          {targetLevel === "CEO" ? (
            <Crown className="h-5 w-5 text-white" />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            {targetLevel === "CEO" ? "CEO审批流程" : "总监审批流程"}
          </h3>
          <p className="text-xs text-gray-600">简化流程，快速审批</p>
        </div>
      </div>
      <ApprovalFlowChart
        type={targetLevel === "CEO" ? "other-ceo" : "other-director"}
      />
    </div>
  );
}
