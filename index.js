const functions = require('firebase-functions');
const admin     = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/* ═══════════════════════════════════════════
   SEND PUSH NOTIFICATION HELPER
═══════════════════════════════════════════ */
async function sendPushNotification(token, title, body, data = {}) {
  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v || '')])
      ),
      webpush: {
        notification: {
          title,
          body,
          icon:               'https://muhilanm242008-m.github.io/web-messager/icon.png',
          badge:              'https://muhilanm242008-m.github.io/web-messager/icon.png',
          tag:                data.tag || 'sm-' + Date.now(),
          requireInteraction: false,
          vibrate:            [200, 100, 200]
        },
        fcmOptions: {
          link: data.url ||
            'https://muhilanm242008-m.github.io/web-messager/notifications.html'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push sent:', response);
    return true;

  } catch (err) {
    console.error('❌ Push failed:', err.code, err.message);

    // Remove invalid tokens
    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered'
    ) {
      try {
        await db.collection('fcmTokens').doc(data.recipientId).delete();
        console.log('Removed invalid token for:', data.recipientId);
      } catch (_) {}
    }
    return false;
  }
}

/* ═══════════════════════════════════════════
   GET FCM TOKEN FOR USER
═══════════════════════════════════════════ */
async function getFCMToken(uid) {
  try {
    const doc = await db.collection('fcmTokens').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data().token || null;
  } catch (_) {
    return null;
  }
}

/* ═══════════════════════════════════════════
   SAVE NOTIFICATION TO FIRESTORE
═══════════════════════════════════════════ */
async function saveNotification(uid, data) {
  try {
    await db.collection('users')
      .doc(uid)
      .collection('notifications')
      .add({
        ...data,
        read:      false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  } catch (err) {
    console.error('Save notification error:', err.message);
  }
}

/* ═══════════════════════════════════════════
   TRIGGER 1: NEW MESSAGE
   Fires when a message is created in any chat
═══════════════════════════════════════════ */
exports.onNewMessage = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const message  = snap.data();
      const chatId   = context.params.chatId;
      const senderId = message.senderId;

      if (!senderId || !message.text) return null;

      // Get chat participants
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (!chatDoc.exists) return null;

      const participants = chatDoc.data().participants || [];
      const recipientId  = participants.find(uid => uid !== senderId);
      if (!recipientId) return null;

      // Get sender info
      const senderDoc  = await db.collection('users').doc(senderId).get();
      const senderData = senderDoc.exists ? senderDoc.data() : {};
      const senderName = senderData.name
                      || senderData.displayName
                      || senderData.username
                      || 'Someone';

      const msgPreview = message.text.length > 100
        ? message.text.substring(0, 100) + '...'
        : message.text;

      // Save to Firestore notifications
      await saveNotification(recipientId, {
        type:         'message',
        fromUid:      senderId,
        fromName:     senderName,
        fromUsername: senderData.username || '',
        fromPhoto:    senderData.photo    || senderData.photoURL || '',
        chatFriendId: senderId,
        chatId,
        body:         msgPreview
      });

      // Send push notification
      const token = await getFCMToken(recipientId);
      if (!token) return null;

      await sendPushNotification(
        token,
        senderName,
        msgPreview,
        {
          type:         'message',
          fromUid:      senderId,
          fromName:     senderName,
          fromPhoto:    senderData.photo || senderData.photoURL || '',
          chatFriendId: senderId,
          chatId,
          tag:          'msg-' + senderId,
          recipientId,
          url: 'https://muhilanm242008-m.github.io/web-messager/chat.html'
        }
      );

      return null;

    } catch (err) {
      console.error('onNewMessage error:', err);
      return null;
    }
  });

/* ═══════════════════════════════════════════
   TRIGGER 2: NEW FRIEND REQUEST
   Fires when a friend request is created
═══════════════════════════════════════════ */
exports.onNewFriendRequest = functions.firestore
  .document('friend_requests/{requestId}')
  .onCreate(async (snap, context) => {
    try {
      const request  = snap.data();
      const toUid    = request.toUid;
      const fromUid  = request.fromUid;
      const fromName = request.fromName || 'Someone';

      if (!toUid || !fromUid) return null;

      // Save to Firestore notifications
      await saveNotification(toUid, {
        type:         'request',
        fromUid,
        fromName,
        fromUsername: request.fromUsername || '',
        fromPhoto:    request.fromPhoto    || '',
        body:         fromName + ' sent you a friend request!',
        status:       'pending'
      });

      // Send push notification
      const token = await getFCMToken(toUid);
      if (!token) return null;

      await sendPushNotification(
        token,
        '👋 Friend Request',
        fromName + ' sent you a friend request!',
        {
          type:        'request',
          fromUid,
          fromName,
          fromPhoto:   request.fromPhoto || '',
          requestId:   context.params.requestId,
          tag:         'req-' + fromUid,
          recipientId: toUid,
          url: 'https://muhilanm242008-m.github.io/web-messager/notifications.html'
        }
      );

      return null;

    } catch (err) {
      console.error('onNewFriendRequest error:', err);
      return null;
    }
  });

/* ═══════════════════════════════════════════
   TRIGGER 3: FRIEND REQUEST ACCEPTED
   Fires when request status changes to accepted
═══════════════════════════════════════════ */
exports.onFriendRequestAccepted = functions.firestore
  .document('friend_requests/{requestId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after  = change.after.data();

      // Only fire when status changes to accepted
      if (before.status === after.status) return null;
      if (after.status !== 'accepted')    return null;

      const fromUid = after.fromUid;
      const toUid   = after.toUid;

      // Get acceptor info
      const acceptorDoc  = await db.collection('users').doc(toUid).get();
      const acceptorData = acceptorDoc.exists ? acceptorDoc.data() : {};
      const acceptorName = acceptorData.name
                        || acceptorData.username
                        || 'Someone';

      // Send push to original requester
      const token = await getFCMToken(fromUid);
      if (!token) return null;

      await sendPushNotification(
        token,
        '✅ Friend Request Accepted',
        acceptorName + ' accepted your friend request!',
        {
          type:         'system',
          fromUid:      toUid,
          fromName:     acceptorName,
          chatFriendId: toUid,
          tag:          'accept-' + toUid,
          recipientId:  fromUid,
          url: 'https://muhilanm242008-m.github.io/web-messager/chat.html'
        }
      );

      return null;

    } catch (err) {
      console.error('onFriendRequestAccepted error:', err);
      return null;
    }
  });
