import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  asChild?: boolean
}

function Button({
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  
  const variantClass = {
    default: "",
    destructive: "widget-badge-destructive",
    outline: "widget-button-outline",
    secondary: "widget-button-secondary",
    ghost: "widget-button-ghost",
    link: "widget-button-ghost",
  }[variant]

  const sizeClass = {
    default: "",
    sm: "widget-button-sm",
    lg: "widget-button-lg",
    icon: "widget-button-icon",
    "icon-sm": "widget-button-icon-sm",
    "icon-lg": "widget-button-icon-lg",
  }[size]

  return (
    <Comp
      data-slot="button"
      className={`widget-button ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    />
  )
}

export { Button }
