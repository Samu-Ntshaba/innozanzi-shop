"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";

const storageKey = "innozanzi-admin-focus-mode";
const focusModeEvent = "innozanzi-admin-focus-mode-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(focusModeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(focusModeEvent, onChange);
  };
};

const getSnapshot = () => window.localStorage.getItem(storageKey) === "true";
const getServerSnapshot = () => false;

export function AdminWorkspace({
  mobileNavigation,
  desktopNavigation,
  children,
}: {
  mobileNavigation: ReactNode;
  desktopNavigation: ReactNode;
  children: ReactNode;
}) {
  const focusMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setFocusMode = (enabled: boolean) => {
    window.localStorage.setItem(storageKey, String(enabled));
    window.dispatchEvent(new Event(focusModeEvent));
  };

  useEffect(() => {
    const restoreNavigation = (event: KeyboardEvent) => {
      if (event.key === "Escape" && focusMode) setFocusMode(false);
    };
    window.addEventListener("keydown", restoreNavigation);
    return () => window.removeEventListener("keydown", restoreNavigation);
  }, [focusMode]);

  return (
    <>
      {!focusMode ? mobileNavigation : null}
      <div className={`grid min-h-[calc(100vh-3.5rem)] ${focusMode ? "grid-cols-1" : "lg:grid-cols-[280px_minmax(0,1fr)]"}`}>
        {!focusMode ? desktopNavigation : null}
        <main className={`min-w-0 p-4 sm:p-5 lg:p-6 ${focusMode ? "mx-auto w-full max-w-[1920px]" : ""}`}>
          <div className="mb-3 flex justify-end">
            <button
              aria-pressed={focusMode}
              className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-sky-500 hover:text-sky-700"
              onClick={() => setFocusMode(!focusMode)}
              title={focusMode ? "Restore the admin menu (Esc)" : "Hide the admin menu and use the full workspace"}
              type="button"
            >
              {focusMode ? <PanelLeftOpen aria-hidden="true" size={16} /> : <PanelLeftClose aria-hidden="true" size={16} />}
              {focusMode ? "Show menu" : "Full-width view"}
            </button>
          </div>
          {children}
        </main>
      </div>
    </>
  );
}
