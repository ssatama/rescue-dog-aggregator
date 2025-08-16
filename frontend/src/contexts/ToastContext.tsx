"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import Toast, { ToastType, ToastPosition } from "../components/ui/Toast";

interface ToastOptions {
  duration?: number;
  position?: ToastPosition;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastState {
  isVisible: boolean;
  type: ToastType;
  message: string;
  duration: number;
  position: ToastPosition;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    type: "success",
    message: "",
    duration: 3000,
    position: "bottom",
  });

  const showToast = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}) => {
      setToast({
        isVisible: true,
        type,
        message,
        duration: options.duration || 3000,
        position: options.position || "bottom",
      });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        type={toast.type}
        message={toast.message}
        isVisible={toast.isVisible}
        duration={toast.duration}
        position={toast.position}
        onDismiss={hideToast}
      />
    </ToastContext.Provider>
  );
}
