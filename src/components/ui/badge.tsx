import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: "default" | "secondary" | "destructive" | "outline"
  asChild?: boolean
}

function Badge({
  className = "",
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  const variantClass = {
    default: "widget-badge-default",
    secondary: "widget-badge-default",
    destructive: "widget-badge-destructive",
    outline: "widget-badge-outline",
  }[variant]

  return (
    <Comp
      data-slot="badge"
      className={`widget-badge ${variantClass} ${className}`.trim()}
      {...props}
    />
  )
}

export { Badge }
