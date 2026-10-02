"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { nanoid } from "nanoid";
import clsx from "clsx";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; message: string };
type ToastApi = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastApi>(() => undefined);
const DISMISS_MS = 3500;

export const useToast = (): ToastApi => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<ToastApi>((message, kind = "success") => {
    const id = nanoid(6);
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), DISMISS_MS);
  }, []);

  const api = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto max-w-sm flex items-center gap-2 rounded-full px-4 py-2.5 text-sm shadow-[var(--pop)]",
              t.kind === "error" && "bg-red-700 text-white",
              t.kind === "success" && "bg-[var(--ink)] text-[var(--paper)]",
              t.kind === "info" && "bg-[var(--card)] text-[var(--ink)] ring-1 ring-[var(--line)]",
            )}
          >
            {t.kind === "error" ? (
              <CircleAlert aria-hidden className="size-4 shrink-0" />
            ) : (
              <CircleCheck aria-hidden className="size-4 shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
