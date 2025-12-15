import * as React from "react"

function Card({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={`widget-card ${className}`.trim()}
      {...props}
    />
  )
}

function CardHeader({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={`widget-card-header ${className}`.trim()}
      {...props}
    />
  )
}

function CardTitle({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={`widget-card-title ${className}`.trim()}
      {...props}
    />
  )
}

function CardDescription({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={`widget-card-description ${className}`.trim()}
      {...props}
    />
  )
}

function CardAction({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={className}
      {...props}
    />
  )
}

function CardContent({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={`widget-card-content ${className}`.trim()}
      {...props}
    />
  )
}

function CardFooter({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={className}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
