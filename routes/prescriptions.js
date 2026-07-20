const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const store = require('../data/store');
const { extractPrescriptionFromImage, generateTranslatedReminder } = require('../services/gptService');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  }
});

router.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'An image file is required in the image field.' });
    }

    const extracted = await extractPrescriptionFromImage(req.file.buffer.toString('base64'));
    return res.status(200).json(extracted);
  } catch (error) {
    return next(error);
  }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const { medicines, languageCode } = req.body || {};
    const elderPushSubscriptionId = req.body?.elderPushSubscriptionId || req.body?.elderSubscriptionId;
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: 'medicines must be a non-empty array.' });
    }
    if (typeof languageCode !== 'string' || !languageCode.trim()) {
      return res.status(400).json({ error: 'languageCode is required.' });
    }
    if (typeof elderPushSubscriptionId !== 'string' || !elderPushSubscriptionId) {
      return res.status(400).json({ error: 'elderPushSubscriptionId is required.' });
    }
    if (!store.pushSubscriptions.some((entry) => entry.id === elderPushSubscriptionId && entry.type === 'elder')) {
      return res.status(400).json({ error: 'elderPushSubscriptionId does not identify an elder subscription.' });
    }
    if (medicines.some((medicine) => !medicine || typeof medicine.name !== 'string' || !medicine.name.trim())) {
      return res.status(400).json({ error: 'Every medicine must include a name.' });
    }

    // Generate every translation before mutating the store, avoiding partial saves.
    const confirmedMedicines = await Promise.all(medicines.map(async (medicine) => ({
      ...medicine,
      id: medicine.id || crypto.randomUUID(),
      translatedReminderText: await generateTranslatedReminder(medicine.name, languageCode),
      languageCode,
      elderPushSubscriptionId,
      confirmed: true,
      confirmedByFamily: true
    })));

    store.medicines.push(...confirmedMedicines);
    return res.status(201).json({ medicines: confirmedMedicines });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
