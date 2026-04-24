self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Scheduler";
  const options = {
    body: payload.body || "You have a new workflow notification.",
    data: payload.data || {},
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-64.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/notifications";
  event.waitUntil(clients.openWindow(targetUrl));
});