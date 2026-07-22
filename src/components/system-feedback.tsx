"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const REQUEST_TIMEOUT_MS = 20_000;

type Notice = { tone: "busy" | "error"; message: string } | null;

export function SystemFeedback() {
  const [notice, setNotice] = useState<Notice>(null);
  const pathname = usePathname();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let activeButton: HTMLButtonElement | HTMLInputElement | null = null;
    const originalFetch = window.fetch;

    const restore = () => {
      if (timeout) clearTimeout(timeout);
      if (activeButton) {
        activeButton.disabled = false;
        activeButton.removeAttribute("aria-busy");
        activeButton.classList.remove("system-button-pending");
      }
      activeButton = null;
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.checkValidity()) return;
      const submitter = event.submitter;
      if (!(submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement)) return;

      restore();
      activeButton = submitter;
      submitter.disabled = true;
      submitter.setAttribute("aria-busy", "true");
      submitter.classList.add("system-button-pending");
      setNotice({ tone: "busy", message: "Processing your request…" });

      timeout = setTimeout(() => {
        restore();
        setNotice({ tone: "error", message: "This request is taking too long. Please check your connection and try again." });
      }, REQUEST_TIMEOUT_MS);
    };

    const finish = () => {
      restore();
      setNotice(null);
    };

    window.fetch = async (...args) => {
      const method = (args[1]?.method ?? (args[0] instanceof Request ? args[0].method : "GET")).toUpperCase();
      try {
        const response = await originalFetch(...args);
        if (activeButton && method === "POST") finish();
        return response;
      } catch (error) {
        if (activeButton && method === "POST") {
          restore();
          setNotice({ tone: "error", message: "The request could not reach the server. Please check your connection and try again." });
        }
        throw error;
      }
    };

    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("pageshow", finish);
    window.addEventListener("popstate", finish);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pageshow", finish);
      window.removeEventListener("popstate", finish);
      window.fetch = originalFetch;
      restore();
    };
  }, [pathname]);

  if (!notice) return null;
  return (
    <div aria-live="polite" aria-atomic="true" className={`system-notice system-notice-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
      {notice.tone === "busy" ? <span className="system-spinner" aria-hidden="true" /> : null}
      <span>{notice.message}</span>
      {notice.tone === "error" ? <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button> : null}
    </div>
  );
}
