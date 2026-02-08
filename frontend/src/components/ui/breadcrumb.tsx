import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbProps {
  children: React.ReactNode
  className?: string
}

function Breadcrumb({ children, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex", className)}>
      {children}
    </nav>
  )
}

interface BreadcrumbListProps {
  children: React.ReactNode
  className?: string
}

function BreadcrumbList({ children, className }: BreadcrumbListProps) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {children}
    </ol>
  )
}

interface BreadcrumbItemProps {
  children: React.ReactNode
  className?: string
}

function BreadcrumbItem({ children, className }: BreadcrumbItemProps) {
  return (
    <li className={cn("inline-flex items-center gap-1.5", className)}>
      {children}
    </li>
  )
}

interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode
  asChild?: boolean
}

function BreadcrumbLink({ children, className, asChild, ...props }: BreadcrumbLinkProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: cn("text-sm text-gray-500 hover:text-gray-900 transition-colors", className),
    })
  }

  return (
    <a
      className={cn("text-sm text-gray-500 hover:text-gray-900 transition-colors", className)}
      {...props}
    >
      {children}
    </a>
  )
}

interface BreadcrumbSeparatorProps {
  children?: React.ReactNode
  className?: string
}

function BreadcrumbSeparator({ children, className }: BreadcrumbSeparatorProps) {
  return (
    <li className={className}>
      {children ?? <ChevronRight className="h-4 w-4 text-gray-400" />}
    </li>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
}
