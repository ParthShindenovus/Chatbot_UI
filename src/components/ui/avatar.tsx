import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

function Avatar({
  className = "",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={`widget-avatar ${className}`.trim()}
      {...props}
    />
  )
}

function AvatarImage({
  className = "",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={className}
      {...props}
    />
  )
}

function AvatarFallback({
  className = "",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={`widget-avatar-fallback ${className}`.trim()}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
