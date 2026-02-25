import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const SheetContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

function Sheet({ children, open: controlledOpen, onOpenChange }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

interface SheetTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

function SheetTrigger({ children, asChild }: SheetTriggerProps) {
  const { setOpen } = React.useContext(SheetContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: () => setOpen(true),
    })
  }

  return <button onClick={() => setOpen(true)}>{children}</button>
}

interface SheetContentProps {
  children: React.ReactNode
  className?: string
  side?: "left" | "right" | "top" | "bottom"
}

function SheetContent({ children, className, side = "right" }: SheetContentProps) {
  const { open, setOpen } = React.useContext(SheetContext)

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed z-50 bg-white shadow-lg",
          side === "left" && "inset-y-0 left-0 h-full w-3/4 max-w-sm",
          side === "right" && "inset-y-0 right-0 h-full w-3/4 max-w-sm",
          side === "top" && "inset-x-0 top-0 w-full h-auto max-h-96",
          side === "bottom" && "inset-x-0 bottom-0 w-full h-auto max-h-96",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 z-50 p-1 rounded-md hover:bg-gray-100 cursor-pointer"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </>
  )
}

interface SheetHeaderProps {
  children: React.ReactNode
  className?: string
}

function SheetHeader({ children, className }: SheetHeaderProps) {
  return <div className={cn("px-6 py-4 border-b", className)}>{children}</div>
}

interface SheetTitleProps {
  children: React.ReactNode
  className?: string
}

function SheetTitle({ children, className }: SheetTitleProps) {
  return <h3 className={cn("text-lg font-semibold", className)}>{children}</h3>
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle }
