"use client";
import { useCallback, useEffect, useState } from "react";

type State = "loading"|"ready"|"enabled"|"blocked"|"unsupported"|"unconfigured"|"ios-install"|"error";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function MobilePushControl() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [state, setState] = useState<State>(publicKey ? "loading" : "unconfigured");
  const inspect = useCallback(async () => {
    if (!publicKey) return;
    if (isIOS() && !isStandalone()) return setState("ios-install");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
    if (Notification.permission === "denied") return setState("blocked");
    try {
      const registration=await navigator.serviceWorker.register("/sw.js");
      const subscription=await registration.pushManager.getSubscription();
      setState(subscription ? "enabled" : "ready");
    } catch (error) {
      console.error("Mobile notification setup failed", error);
      setState("error");
    }
  }, [publicKey]);

  useEffect(() => { void Promise.resolve().then(inspect); }, [inspect]);

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "ready");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
      const response = await fetch("/api/mobile-admin/push-subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      setState(response.ok ? "enabled" : "error");
    } catch (error) {
      console.error("Mobile notification subscription failed", error);
      setState("error");
    }
  }

  const copy = state === "enabled" ? "Notifications enabled on this device" : state === "blocked" ? "Notifications are blocked. Allow them in your device settings." : state === "unsupported" ? "Push notifications are not available in this browser or device version." : state === "unconfigured" ? "Push notifications are not configured yet." : state === "error" ? "Notifications could not start. Check your connection and try again." : "Get alerts for orders and customer requests.";
  return <div className="rounded-2xl bg-[#0a6ed1] p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[.15em] text-sky-100">Mobile alerts</p>{state === "ios-install" ? <div className="mt-3"><p className="text-base font-bold">Install Mobile Admin first</p><p className="mt-2 text-sm leading-6 text-sky-50">On iPhone, notifications work from the Home Screen app—not from this Chrome tab.</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6"><li>Tap the Share button at the top.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Open <strong>Innozanzi Admin</strong> from the new icon.</li><li>Tap <strong>Enable notifications</strong> there.</li></ol></div> : <><p className="mt-2 text-sm font-semibold">{copy}</p>{state === "ready" ? <button onClick={enable} className="mt-4 min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-[#071b33]">Enable notifications</button> : null}{state === "error" ? <button onClick={()=>void inspect()} className="mt-4 min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-[#071b33]">Try again</button> : null}</>}</div>;
}
