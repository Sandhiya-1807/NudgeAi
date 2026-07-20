/**
 * Process-local push subscription registry. Replace this with durable storage
 * before running more than one server instance or restarting the service.
 */
const crypto = require('crypto');

const pushSubscriptions = [];
const medicines = [];
const events = [];
const reminders = [];

function addPushSubscription(subscription, type) {
  const endpoint = subscription.endpoint;
  const existingIndex = pushSubscriptions.findIndex(
    (entry) => entry.subscription.endpoint === endpoint
  );
  const existing = existingIndex >= 0 ? pushSubscriptions[existingIndex] : null;
  const record = { id: existing?.id || crypto.randomUUID(), subscription, type };

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
  medicines,
  events,
  reminders,
  addPushSubscription,
  removePushSubscription
};
