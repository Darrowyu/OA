import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("DropdownMenu components must be used within DropdownMenu")
  }
  return context
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  onClick?: (e: React.MouseEvent) => void
}

function DropdownMenuTrigger({ children, asChild, onClick }: DropdownMenuTriggerProps) {
  const { setOpen, triggerRef } = useDropdownMenu()
  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e)
    setOpen(true)
  }

  if (asChild && React.isValidElement(children)) {
    return (
      <div ref={triggerRef} className="inline-block">
        {React.cloneElement(children as React.ReactElement, {
          onClick: handleClick,
        })}
      </div>
    )
  }

  return (
    <div ref={triggerRef} className="inline-block">
      <button onClick={handleClick}>{children}</button>
    </div>
  )
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: "start" | "end" | "center"
  className?: string
}

function DropdownMenuContent({ children, align = "center", className }: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef } = useDropdownMenu()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [open])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, setOpen])

  if (!open) return null

  const alignStyles = {
    start: { left: position.left },
    center: { left: position.left + position.width / 2, transform: "translateX(-50%)" },
    end: { left: position.left + position.width, transform: "translateX(-100%)" },
  }

  return (
    <div
      ref={contentRef}
      style={{
        position: "fixed",
        top: position.top + 4,
        ...alignStyles[align],
      }}
      className={cn(
        "z-50 min-w-[8rem] rounded-md border bg-white p-1 shadow-md",
        className
      )}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
}

function DropdownMenuItem({ children, className, onClick, disabled }: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenu()
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    onClick?.(e)
    setOpen(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "relative flex w-full select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-gray-100",
        className
      )}
    >
      {children}
    </button>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn("-mx-1 my-1 h-px bg-gray-200", className)} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
