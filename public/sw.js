self.addEventListener("push", event => {
  let data = { title: "Innozanzi Mobile Admin", body: "New activity needs attention.", url: "/mobile-admin", tag: "mobile-admin" };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon.png", badge: "/icon.png", tag: data.tag, data: { url: data.url } }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/mobile-admin", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const open = windows.find(window => window.url.startsWith(self.location.origin));
    if (open) { open.navigate(target); return open.focus(); }
    return clients.openWindow(target);
  }));
});
