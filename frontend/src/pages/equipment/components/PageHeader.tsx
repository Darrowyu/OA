import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  buttonText?: string
  buttonIcon?: LucideIcon
  onButtonClick?: () => void
}

export function PageHeader({
  title,
  description,
  buttonText,
  buttonIcon: ButtonIcon = Plus,
  onButtonClick
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-gray-500 mt-1">{description}</p>}
      </div>
      {buttonText && (
        <Button className="bg-gray-900 hover:bg-gray-800" onClick={onButtonClick}>
          <ButtonIcon className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      )}
    </div>
  )
}
