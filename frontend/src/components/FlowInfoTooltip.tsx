import * as React from "react";
import { HelpCircle, Users, User, Crown, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowInfoTooltipProps {
  type: "standard" | "other";
  targetLevel?: "DIRECTOR" | "CEO";
  className?: string;
}

interface FlowStep {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}

const standardSteps: FlowStep[] = [
  { icon: <Users className="h-3.5 w-3.5" />, title: "厂长审批", desc: "并行审批，需全部通过", color: "text-blue-600 bg-blue-50" },
  { icon: <User className="h-3.5 w-3.5" />, title: "总监审批", desc: "选择流向：经理/CEO/完成", color: "text-amber-600 bg-amber-50" },
  { icon: <Crown className="h-3.5 w-3.5" />, title: "最终审批", desc: "经理或CEO审批", color: "text-emerald-600 bg-emerald-50" },
];

const otherDirectorSteps: FlowStep[] = [
  { icon: <Circle className="h-3.5 w-3.5" />, title: "提交申请", desc: "直接提交给总监", color: "text-gray-600 bg-gray-50" },
  { icon: <User className="h-3.5 w-3.5" />, title: "总监审批", desc: "审批后流程结束", color: "text-amber-600 bg-amber-50" },
  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, title: "审批完成", desc: "申请处理完毕", color: "text-emerald-600 bg-emerald-50" },
];

const otherCeoSteps: FlowStep[] = [
  { icon: <Circle className="h-3.5 w-3.5" />, title: "提交申请", desc: "直接提交给CEO", color: "text-gray-600 bg-gray-50" },
  { icon: <Crown className="h-3.5 w-3.5" />, title: "CEO审批", desc: "审批后流程结束", color: "text-purple-600 bg-purple-50" },
  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, title: "审批完成", desc: "申请处理完毕", color: "text-emerald-600 bg-emerald-50" },
];

export function FlowInfoTooltip({ type, targetLevel, className }: FlowInfoTooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const steps = type === "standard"
    ? standardSteps
    : targetLevel === "CEO"
    ? otherCeoSteps
    : otherDirectorSteps;

  const title = type === "standard"
    ? "标准审批流程"
    : targetLevel === "CEO"
    ? "CEO审批流程"
    : "总监审批流程";

  const subtitle = type === "standard"
    ? "多级审批，逐级流转"
    : "简化流程，快速审批";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-1.5 transition-colors",
          "text-gray-400 hover:text-blue-500 hover:bg-blue-50",
          isOpen && "text-blue-500 bg-blue-50",
          className
        )}
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-full top-0 ml-2 z-50 w-72 bg-white rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 px-4 py-3 border-b">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            </div>
            <div className="p-4 space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
                    step.color
                  )}>
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{step.title}</span>
                      {index < steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-gray-300" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
