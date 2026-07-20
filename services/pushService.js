const webpush = require('web-push');

let vapidKeys;

/**
 * Loads VAPID keys from the environment, generating a process-local pair when
 * they have not been configured. Persist generated keys in env for production.
 */
function getVapidKeys() {
  if (vapidKeys) return vapidKeys;

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    vapidKeys = { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    console.warn(
      'VAPID keys are not configured. Generated keys will change after a server restart.'
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@nudgeai.local',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  return vapidKeys;
}

async function sendPushNotification(subscription, payload) {
  getVapidKeys();
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return webpush.sendNotification(subscription, message);
}

module.exports = { getVapidKeys, sendPushNotification };
