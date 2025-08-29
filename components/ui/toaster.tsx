"use client"

import { useToast } from "@/hooks/use-toast"
import { Toast } from "./toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full space-y-0">
      {toasts.map((toast) => (
        <Toast 
          key={toast.id} 
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          open={toast.open}
          onDismiss={dismiss} 
        />
      ))}
    </div>
  )
}
