// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAFKOgNZgaIZ9q09VvmKJrnEWys7ancSEE",
  authDomain: "web-messager-533ae.firebaseapp.com",
  projectId: "web-messager-533ae",
  storageBucket: "web-messager-533ae.firebasestorage.app",
  messagingSenderId: "466370688536",
  appId: "1:466370688536:web:90e63387db2e4b697ff56d"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'New Message', {
    body: body || '',
    icon: '/icon.png'
  });
});
