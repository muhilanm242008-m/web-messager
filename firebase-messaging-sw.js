// firebase-messaging-sw.js
// Place this file at the ROOT of your repository
// File path: /firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// ✅ Same config as your main app
firebase.initializeApp({
  apiKey:            "AIzaSyAFKOgNZgaIZ9q09VvmKJrnEWys7ancSEE",
  authDomain:        "web-messager-533ae.firebaseapp.com",
  projectId:         "web-messager-533ae",
  storageBucket:     "web-messager-533ae.firebasestorage.app",
  messagingSenderId: "466370688536",
  appId:             "1:466370688536:web:90e63387db2e4b697ff56d"
});

const messaging = firebase.messaging();

// ─────────────────────────────────────────
// BACKGROUND MESSAGE HANDLER
// Fires when app is CLOSED or in background
// ─────────────────────────────────────────
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message received:', payload);

  const notification = payload.notification || {};
  const data         = payload.data         || {};

  const title = notification.title || 'Secure Messenger';
  const body  = notification.body  || 'You have a new notification';
  const icon  = notification.icon  || '/icon.png';

  self.registration.showNotification(title, {
    body,
    icon,
    badge:   '/badge.png',
    tag:     data.tag || 'sm-' + Date.now(),
    data:    data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'open',    title: '💬 Open' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  });
});

// ─────────────────────────────────────────
// NOTIFICATION CLICK HANDLER
// ─────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  console.log('[SW] Notification clicked:', e.action);
  e.notification.close();

  if (e.action === 'dismiss') return;

  const data      = e.notification.data || {};
  const targetUrl = data.chatFriendId
    ? 'https://muhilanm242008-m.github.io/chat.html'
    : 'https://muhilanm242008-m.github.io/chats.html';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app already open → focus it and send message
        for (const client of clientList) {
          if (client.url.includes('muhilanm242008-m.github.io') && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NOTIFICATION_CLICK', data });
            return;
          }
        }
        // Otherwise open new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─────────────────────────────────────────
// PUSH EVENT (fallback if FCM doesn't handle)
// ─────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch (_) {
    payload = {
      notification: { title: 'Secure Messenger', body: e.data.text() }
    };
  }

  const notification = payload.notification || {};
  const data         = payload.data         || {};

  e.waitUntil(
    self.registration.showNotification(
      notification.title || 'Secure Messenger',
      {
        body:               notification.body || '',
        icon:               notification.icon || '/icon.png',
        badge:              '/badge.png',
        data,
        requireInteraction: true,
        vibrate:            [200, 100, 200]
      }
    )
  );
});

// ─────────────────────────────────────────
// INSTALL & ACTIVATE (keep SW up to date)
// ─────────────────────────────────────────
self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', e => {
  console.log('[SW] Activated');
  e.waitUntil(clients.claim()); // Take control immediately
});
