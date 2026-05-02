importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyAFKOgNZgaIZ9q09VvmKJrnEWys7ancSEE",
  authDomain:        "web-messager-533ae.firebaseapp.com",
  projectId:         "web-messager-533ae",
  storageBucket:     "web-messager-533ae.firebasestorage.app",
  messagingSenderId: "466370688536",
  appId:             "1:466370688536:web:90e63387db2e4b697ff56d"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(payload => {
  console.log('Background message received:', payload);

  const { title, body, icon } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || 'Secure Messenger', {
    body:    body  || 'You have a new notification',
    icon:    icon  || '/icon.png',
    badge:   '/badge.png',
    tag:     data.tag || 'default',
    data:    data,
    actions: [
      { action: 'open',    title: '💬 Open' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ],
    vibrate:  [200, 100, 200],
    requireInteraction: true
  });
});

// Handle notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();

  const data   = e.notification.data || {};
  const action = e.action;

  if (action === 'dismiss') return;

  // Open or focus the app
  const urlToOpen = data.url || data.chatUrl || '/chats.html';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Send message to client to navigate
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// Handle push event directly (fallback)
self.addEventListener('push', e => {
  if (!e.data) return;

  let payload;
  try { payload = e.data.json(); } 
  catch { payload = { notification: { title: 'Secure Messenger', body: e.data.text() } }; }

  const notification = payload.notification || {};

  e.waitUntil(
    self.registration.showNotification(notification.title || 'Secure Messenger', {
      body:  notification.body || '',
      icon:  notification.icon || '/icon.png',
      badge: '/badge.png',
      data:  payload.data || {},
      requireInteraction: true
    })
  );
});
