"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

// Toast context
const ToastContext = createContext(null);

// Individual Toast component
export function Toast({ message, type = 'info', isVisible, onClose }) {
  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-[500px] transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${typeStyles[type]}`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-3 p-1 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast provider component
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const newToast = {
      id: Date.now(),
      message,
      type,
      isVisible: true
    };
    
    // Clear any existing toast and show new one
    setToast(newToast);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setToast(prev => {
        if (prev && prev.id === newToast.id) {
          return { ...prev, isVisible: false };
        }
        return prev;
      });
      
      // Remove from state after animation
      setTimeout(() => {
        setToast(prev => {
          if (prev && prev.id === newToast.id) {
            return null;
          }
          return prev;
        });
      }, 300);
    }, duration);

    return timer;
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => prev ? { ...prev, isVisible: false } : null);
    
    // Remove from state after animation
    setTimeout(() => {
      setToast(null);
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
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
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}