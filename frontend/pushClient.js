function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

async function subscribeToPush(type) {
  if (!['elder', 'family'].includes(type)) {
    throw new Error("Subscription type must be 'elder' or 'family'.");
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  const registration = await navigator.serviceWorker.register('/service-worker.js');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const { publicKey } = await fetch('/api/push/vapid-public-key').then((response) => {
    if (!response.ok) throw new Error('Unable to retrieve the VAPID public key.');
    return response.json();
  });
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, type })
  });
  if (!response.ok) throw new Error('Unable to save the push subscription.');

  return subscription;
}

window.subscribeToPush = subscribeToPush;
