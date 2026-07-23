'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 4000;
const FADE_MS = 200;

function ToastPill({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const shown = visible && !toast.leaving;

  return (
    <div
      className={`flex items-center gap-2 bg-gray-900 text-white rounded-xl px-5 py-3 shadow-lg max-w-[400px] text-center text-body-md transition-opacity duration-200 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle size={18} weight="fill" style={{ color: '#4ade80' }} className="shrink-0" />
      ) : (
        <WarningCircle size={18} weight="fill" style={{ color: '#f87171' }} className="shrink-0" />
      )}
      <span>{toast.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, FADE_MS);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = idRef.current++;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
      setTimeout(() => removeToast(id), DISMISS_MS);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center px-4 pointer-events-none">
            {toasts.map((toast) => (
              <ToastPill key={toast.id} toast={toast} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
