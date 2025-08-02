"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Icon } from "./Icon";

// Toast types
export type ToastType = "success" | "error" | "info";

export interface ToastData {
  id: number;
  message: string;
  type: ToastType;
  isVisible: boolean;
}

export interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
  ) => NodeJS.Timeout;
  hideToast: () => void;
}

export interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export interface ToastProviderProps {
  children: ReactNode;
}

// Toast context
const ToastContext = createContext<ToastContextType | null>(null);

// Individual Toast component
export function Toast({
  message,
  type = "info",
  isVisible,
  onClose,
}: ToastProps) {
  if (!isVisible) return null;

  const typeStyles: Record<ToastType, string> = {
    success: "bg-green-700 dark:bg-green-600 text-white",
    error: "bg-red-600 dark:bg-red-500 text-white",
    info: "bg-orange-600 dark:bg-orange-500 text-white",
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-[500px] transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      } ${typeStyles[type]}`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-3 p-1 rounded-full hover:bg-black dark:hover:bg-white hover:bg-opacity-20 dark:hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2"
        aria-label="Close notification"
      >
        <Icon name="x" size="small" color="on-dark" />
      </button>
    </div>
  );
}

// Toast provider component
export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      duration: number = 3000,
    ): NodeJS.Timeout => {
      const newToast: ToastData = {
        id: Date.now(),
        message,
        type,
        isVisible: true,
      };

      // Clear any existing toast and show new one
      setToast(newToast);

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setToast((prev) => {
          if (prev && prev.id === newToast.id) {
            return { ...prev, isVisible: false };
          }
          return prev;
        });

        // Remove from state after animation
        setTimeout(() => {
          setToast((prev) => {
            if (prev && prev.id === newToast.id) {
              return null;
            }
            return prev;
          });
        }, 300);
      }, duration);

      return timer;
    },
    [],
  );

  const hideToast = useCallback((): void => {
    setToast((prev) => (prev ? { ...prev, isVisible: false } : null));

    // Remove from state after animation
    setTimeout(() => {
      setToast(null);
    }, 300);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    hideToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
