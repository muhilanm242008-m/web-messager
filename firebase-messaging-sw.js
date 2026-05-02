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
const BASE_URL  = 'https://muhilanm242008-m.github.io/web-messager';

/* ─────────────────────────────────────────
   BACKGROUND MESSAGE
   App is closed or in background
───────────────────────────────────────── */
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload);

  const notification = payload.notification || {};
  const data         = payload.data         || {};

  const title = notification.title
             || data.fromName
             || 'Secure Messenger';

  const body  = notification.body
             || data.body
             || 'You have a new message';

  return self.registration.showNotification(title, {
    body,
    icon:               BASE_URL + '/icon.png',
    badge:              BASE_URL + '/icon.png',
    tag:                data.tag || ('sm-' + Date.now()),
    data,
    vibrate:            [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'open',    title: '💬 Open'    },
      { action: 'dismiss', title: '✕ Dismiss'  }
    ]
  });
});

/* ─────────────────────────────────────────
   NOTIFICATION CLICK
───────────────────────────────────────── */
self.addEventListener('notificationclick', e => {
  console.log('[SW] Notification clicked:', e.action);
  e.notification.close();

  if (e.action === 'dismiss') return;

  const data = e.notification.data || {};

  // Decide where to navigate
  let targetUrl;
  if (data.type === 'message' && data.chatFriendId) {
    targetUrl = BASE_URL + '/chat.html';
  } else if (data.type === 'request') {
    targetUrl = BASE_URL + '/notifications.html';
  } else {
    targetUrl = BASE_URL + '/chats.html';
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {

        // If app already open → focus and send data
        for (const client of clientList) {
          if (client.url.startsWith(BASE_URL) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data
            });
            return;
          }
        }

        // App closed → open it with data in URL
        if (data.type === 'message' && data.fromUid) {
          // Store friend data so chat.html can load it
          const params = new URLSearchParams({
            openChat:   data.fromUid,
            fromName:   data.fromName   || '',
            fromPhoto:  data.fromPhoto  || ''
          });
          targetUrl += '?' + params.toString();
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/* ─────────────────────────────────────────
   PUSH FALLBACK
───────────────────────────────────────── */
self.addEventListener('push', e => {
  if (!e.data) return;

  let payload;
  try   { payload = e.data.json(); }
  catch { payload = { notification: { title: 'Secure Messenger', body: e.data.text() } }; }

  const notification = payload.notification || {};
  const data         = payload.data         || {};

  e.waitUntil(
    self.registration.showNotification(
      notification.title || data.fromName || 'Secure Messenger', {
        body:               notification.body || data.body || '',
        icon:               BASE_URL + '/icon.png',
        badge:              BASE_URL + '/icon.png',
        tag:                data.tag  || 'sm-push',
        data,
        requireInteraction: false,
        vibrate:            [200, 100, 200]
      }
    )
  );
});

/* ─────────────────────────────────────────
   INSTALL & ACTIVATE
───────────────────────────────────────── */
self.addEventListener('install',  e => {
  console.log('[SW] Installed');
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  console.log('[SW] Activated');
  e.waitUntil(clients.claim());
});
