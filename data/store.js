/**
 * Process-local push subscription registry. Replace this with durable storage
 * before running more than one server instance or restarting the service.
 */
const pushSubscriptions = [];

function addPushSubscription(subscription, type) {
  const endpoint = subscription.endpoint;
  const existingIndex = pushSubscriptions.findIndex(
    (entry) => entry.subscription.endpoint === endpoint
  );
  const record = { subscription, type };

  if (existingIndex >= 0) {
    pushSubscriptions[existingIndex] = record;
  } else {
    pushSubscriptions.push(record);
  }

  return record;
}

function removePushSubscription(endpoint) {
  const index = pushSubscriptions.findIndex(
    (entry) => entry.subscription.endpoint === endpoint
  );

  if (index >= 0) pushSubscriptions.splice(index, 1);
}

module.exports = {
  pushSubscriptions,
  addPushSubscription,
  removePushSubscription
};
