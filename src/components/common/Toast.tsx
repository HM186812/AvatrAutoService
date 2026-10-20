import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
}

// Global Toast Dispatcher
type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export const showToast = (message: string, type: ToastType = 'success') => {
  const id = Math.random().toString(36).slice(2, 9);
  listeners.forEach((fn) => fn({ id, message, type }));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleNewToast: ToastListener = (newToast) => {
      setToasts((prev) => [...prev.slice(-3), newToast]);
      setTimeout(() => {
        handleDismiss(newToast.id);
      }, 4500);
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, [handleDismiss]);

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const type = toast.type || 'success';

          const config = {
            success: {
              icon: CheckCircle2,
              iconColor: 'text-emerald-500',
              bgColor: 'bg-white/95 dark:bg-zinc-950/95',
              borderColor: 'border-emerald-500/30 dark:border-emerald-500/40',
              badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
              shadow: 'shadow-[0_12px_32px_-8px_rgba(16,185,129,0.22)]',
            },
            error: {
              icon: AlertCircle,
              iconColor: 'text-rose-500',
              bgColor: 'bg-white/95 dark:bg-zinc-950/95',
              borderColor: 'border-rose-500/30 dark:border-rose-500/40',
              badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
              shadow: 'shadow-[0_12px_32px_-8px_rgba(244,63,94,0.22)]',
            },
            warning: {
              icon: AlertTriangle,
              iconColor: 'text-amber-500',
              bgColor: 'bg-white/95 dark:bg-zinc-950/95',
              borderColor: 'border-amber-500/30 dark:border-amber-500/40',
              badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
              shadow: 'shadow-[0_12px_32px_-8px_rgba(245,158,11,0.22)]',
            },
            info: {
              icon: Info,
              iconColor: 'text-blue-500',
              bgColor: 'bg-white/95 dark:bg-zinc-950/95',
              borderColor: 'border-blue-500/30 dark:border-blue-500/40',
              badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
              shadow: 'shadow-[0_12px_32px_-8px_rgba(59,130,246,0.22)]',
            },
          }[type];

          const IconComponent = config.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={`pointer-events-auto relative flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl ${config.bgColor} ${config.borderColor} ${config.shadow} text-slate-900 dark:text-white transition-all`}
            >
              <div className={`shrink-0 p-1 rounded-xl ${config.badgeBg}`}>
                <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0 pr-1 pt-0.5">
                <p className="text-xs font-semibold leading-relaxed break-words font-sans">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(toast.id)}
                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
