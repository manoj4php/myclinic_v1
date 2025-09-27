import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // Separate toasts by variant
  const errorToasts = toasts.filter(toast => toast.variant === "destructive")
  const otherToasts = toasts.filter(toast => toast.variant !== "destructive")

  return (
    <ToastProvider>
      {/* Error toasts in top-right */}
      {errorToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      {errorToasts.length > 0 && (
        <ToastViewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4 sm:top-0 sm:right-0 sm:bottom-auto sm:flex-col md:max-w-[420px]" />
      )}

      {/* Other toasts in bottom-right (default position) */}
      {otherToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      {otherToasts.length > 0 && <ToastViewport />}
    </ToastProvider>
  )
}
