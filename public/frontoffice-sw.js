self.addEventListener("push", (event) => {
   let payload = {
      title: "FrontOffice",
      body: "You have a new FrontOffice notification.",
      url: "/",
      icon: "/frontoffice-notification-icon.png",
      badge: "/frontoffice-notification-badge.png",
   };

   if (event.data) {
      try {
         payload = {
            ...payload,
            ...event.data.json(),
         };
      } catch {
         payload.body = event.data.text();
      }
   }

   event.waitUntil(
      self.registration.showNotification(payload.title, {
         body: payload.body,
         icon: payload.icon,
         badge: payload.badge,
         data: {
            url: payload.url || "/",
         },
      }),
   );
});

self.addEventListener("notificationclick", (event) => {
   event.notification.close();

   const destination = event.notification.data?.url || "/";

   event.waitUntil(
      clients
         .matchAll({
            type: "window",
            includeUncontrolled: true,
         })
         .then((windowClients) => {
            for (const client of windowClients) {
               if ("focus" in client) {
                  client.navigate(destination);
                  return client.focus();
               }
            }

            if (clients.openWindow) {
               return clients.openWindow(destination);
            }

            return undefined;
         }),
   );
});
