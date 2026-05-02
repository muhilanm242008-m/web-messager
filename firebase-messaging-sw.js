// firebase-messaging-sw.js
// ✅ Place at ROOT of your GitHub repository

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

// ─────────────────────────────────────────────
// Get base URL dynamically
// ─────────────────────────────────────────────
const BASE_URL = self.location.origin + 
  self.location.pathname.replace('/firebase-messaging-sw.js', '');

console.log('[SW] Base URL:', BASE_URL);

// ─────────────────────────────────────────────
// BACKGROUND MESSAGE
// ─────────────────────────────────────────────
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload);

  const notification = payload.notification || {};
  const data         = payload.data         || {};

  const title = notification.title || 'Secure Messenger';
  const body  = notification.body  || 'You have a new notification';

  return self.registration.showNotification(title, {
    body,
    icon:               BASE_URL + '/icon.png',
    badge:              BASE_URL + '/badge.png',
    tag:                data.tag || ('sm-' + Date.now()),
    data,
    vibrate:            [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'open',    title: '💬 Open'    },
      { action: 'dismiss', title: '✕ Dismiss'  }
    ]
  });
});

// ─────────────────────────────────────────────
// NOTIFICATION CLICK
// ─────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  console.log('[SW] Notification clicked, action:', e.action);
  e.notification.close();

  if (e.action === 'dismiss') return;

  const data      = e.notification.data || {};
  const targetUrl = data.chatFriendId
    ? BASE_URL + '/chat.html'
    : BASE_URL + '/chats.html';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window
        for (const client of clientList) {
          if (client.url.startsWith(BASE_URL) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NOTIFICATION_CLICK', data });
            return;
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─────────────────────────────────────────────
// PUSH FALLBACK
// ─────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch (_) {
    payload = {
      notification: {
        title: 'Secure Messenger',
        body:  e.data.text()
      }
    };
  }

  const notification = payload.notification || {};
  const data         = payload.data         || {};

  e.waitUntil(
    self.registration.showNotification(
      notification.title || 'Secure Messenger',
      {
        body:               notification.body || '',
        icon:               BASE_URL + '/icon.png',
        badge:              BASE_URL + '/badge.png',
        data,
        requireInteraction: true,
        vibrate:            [200, 100, 200]
      }
    )
  );
});

// ─────────────────────────────────────────────
// INSTALL
// ─────────────────────────────────────────────
self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  e.waitUntil(self.skipWaiting());
});

// ─────────────────────────────────────────────
// ACTIVATE
// ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  console.log('[SW] Activated');
  e.waitUntil(clients.claim());
});
