const CACHE_NAME = 'nudgeai-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'NudgeAI reminder';
  const options = {
    body: payload.body || '',
    vibrate: Array.isArray(payload.vibrate) ? payload.vibrate : [200, 100, 200],
    data: payload.data || {},
    tag: payload.tag || 'nudgeai-notification',
    renotify: Boolean(payload.renotify)
  };

  // `sound` is honored by some browser/platform combinations; notification
  // sound selection is otherwise controlled by the operating system.
  if (payload.sound) options.sound = payload.sound;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url || '/'));
});
