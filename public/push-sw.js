// Loaded into the app's service worker (see vite.config.ts -> workbox.importScripts).
// This is what makes notifications appear on the phone even when the
// OwodeFood app/tab is closed. Without a "push" handler, the browser
// receives the message from the server but has nothing to show.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "OwodeFood", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "OwodeFood";
  const options = {
    body: data.body || data.message || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,
    // Same tag replaces the old notification instead of stacking; renotify
    // makes the phone still buzz for the update.
    renotify: !!data.tag,
    // Urgent ones (new job, new order) stay on screen until tapped.
    requireInteraction: !!data.urgent,
    vibrate: data.urgent ? [300, 100, 300, 100, 300] : [200],
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, bring it forward and go to the page.
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus().then((c) => (c && "navigate" in c ? c.navigate(target) : c));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
