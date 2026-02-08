import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter, LucideIcon } from "lucide-react"

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  extraButton?: { icon: LucideIcon; onClick: () => void }
}

export function SearchToolbar({
  value,
  onChange,
  placeholder = "搜索...",
  extraButton
}: SearchToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
      <Button variant="outline" size="icon">
        <Filter className="h-4 w-4" />
      </Button>
      {extraButton && (
        <Button variant="outline" size="icon" onClick={extraButton.onClick}>
          <extraButton.icon className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
