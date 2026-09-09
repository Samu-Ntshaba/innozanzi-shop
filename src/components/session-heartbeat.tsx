"use client";
import { useEffect } from "react";

export function SessionHeartbeat() {
  useEffect(() => {
    const ping = () => { if (document.visibilityState === "visible") void fetch("/api/activity", { method: "POST", keepalive: true }); };
    ping();
    const timer = window.setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", ping); };
  }, []);
  return null;
}
