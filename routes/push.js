const express = require('express');
const { addPushSubscription } = require('../data/store');
const { getVapidKeys } = require('../services/pushService');

const router = express.Router();
const subscriptionTypes = new Set(['elder', 'family']);

router.get('/vapid-public-key', (req, res, next) => {
  try {
    res.status(200).json({ publicKey: getVapidKeys().publicKey });
  } catch (error) {
    next(error);
  }
});

router.post('/subscribe', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'A JSON request body is required.' });
  }
  const { subscription, type } = req.body || {};

  if (
    !subscription ||
    typeof subscription.endpoint !== 'string' ||
    !subscription.endpoint ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== 'string' ||
    typeof subscription.keys.auth !== 'string'
  ) {
    return res.status(400).json({ error: 'A valid push subscription is required.' });
  }
  if (!subscriptionTypes.has(type)) {
    return res.status(400).json({ error: "type must be either 'elder' or 'family'." });
  }

  const record = addPushSubscription(subscription, type);
  return res.status(201).json({ status: 'subscribed', type, subscriptionId: record.id });
});

module.exports = router;
