"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "hsl(143 64% 24%)",
          "--success-text": "hsl(0 0% 100%)",
          "--success-border": "hsl(143 64% 24%)",
          "--error-bg": "hsl(0 70% 35%)",
          "--error-text": "hsl(0 0% 100%)",
          "--error-border": "hsl(0 70% 35%)",
          "--warning-bg": "hsl(35 90% 35%)",
          "--warning-text": "hsl(0 0% 100%)",
          "--warning-border": "hsl(35 90% 35%)",
          "--info-bg": "hsl(200 80% 35%)",
          "--info-text": "hsl(0 0% 100%)",
          "--info-border": "hsl(200 80% 35%)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:!text-base group-[.toaster]:!px-4 group-[.toaster]:!py-3",
        },
      }}
      position="top-right"
      richColors
      {...props}
    />
  )
}

export { Toaster }
