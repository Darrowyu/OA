import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionProps {
  children: React.ReactNode
  className?: string
  type?: 'single' | 'multiple'
}

const AccordionContext = React.createContext<{
  openItems: Set<string>
  toggleItem: (id: string) => void
  type: 'single' | 'multiple'
}>({
  openItems: new Set(),
  toggleItem: () => {},
  type: 'multiple',
})

function Accordion({ children, className, type = 'multiple' }: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn("space-y-1", className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  children: React.ReactNode
  value: string
  className?: string
}

function AccordionItem({ children, value, className }: AccordionItemProps) {
  return (
    <div className={cn("border rounded-lg", className)} data-value={value}>
      {children}
    </div>
  )
}

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
}

function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const { openItems, toggleItem, type } = React.useContext(AccordionContext)
  const itemValue = React.useContext(AccordionItemContext)
  const isOpen = openItems.has(itemValue)

  const handleClick = () => {
    if (type === 'single' && isOpen) {
      // 单模式下点击已打开的项，关闭它
      toggleItem(itemValue)
    } else {
      toggleItem(itemValue)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left",
        "hover:bg-gray-50 transition-colors",
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          "w-4 h-4 text-gray-500 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  )
}

const AccordionItemContext = React.createContext<string>("")

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
}

function AccordionContent({ children, className }: AccordionContentProps) {
  const { openItems } = React.useContext(AccordionContext)
  const itemValue = React.useContext(AccordionItemContext)
  const isOpen = openItems.has(itemValue)

  if (!isOpen) return null

  return (
    <div className={cn("px-4 pb-4 text-sm text-gray-600", className)}>
      {children}
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
