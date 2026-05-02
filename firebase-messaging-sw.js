importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
      apiKey: "AIzaSyAFKOgNZgaIZ9q09VvmKJrnEWys7ancSEE",
      authDomain: "web-messager-533ae.firebaseapp.com",
      projectId: "web-messager-533ae",
      storageBucket: "web-messager-533ae.firebasestorage.app",
      messagingSenderId: "466370688536",
      appId: "1:466370688536:web:90e63387db2e4b697ff56d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Secure Messenger', {
    body: body || 'You have a new notification',
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'open', title: '💬 Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = (event.notification.data && event.notification.data.url) || '/chats.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
