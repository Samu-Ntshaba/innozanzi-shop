"use client";
import { useEffect, useState } from "react";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}

export function MobilePushControl() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [state, setState] = useState<"loading"|"ready"|"enabled"|"blocked"|"unsupported"|"unconfigured">(publicKey ? "loading" : "unconfigured");
  useEffect(() => {
    if (!publicKey) return;
    void Promise.resolve().then(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      try { const registration=await navigator.serviceWorker.register("/sw.js");const subscription=await registration.pushManager.getSubscription();setState(subscription ? "enabled" : "ready"); }
      catch { setState("unsupported"); }
    });
  }, [publicKey]);
  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "ready");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
    const response = await fetch("/api/mobile-admin/push-subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
    setState(response.ok ? "enabled" : "ready");
  }
  const copy = state === "enabled" ? "Notifications enabled on this device" : state === "blocked" ? "Notifications are blocked in browser settings" : state === "unsupported" ? "This browser does not support push notifications" : state === "unconfigured" ? "Push keys must be added in Railway" : "Get alerts for orders and customer requests";
  return <div className="rounded-2xl bg-[#0a6ed1] p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[.15em] text-sky-100">Mobile alerts</p><p className="mt-2 text-sm font-semibold">{copy}</p>{state === "ready" ? <button onClick={enable} className="mt-4 min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-[#071b33]">Enable notifications</button> : null}</div>;
}
