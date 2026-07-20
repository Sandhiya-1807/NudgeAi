const crypto = require('crypto');
const cron = require('node-cron');
const store = require('../data/store');
const { sendPushNotification } = require('./pushService');

const ELDER_VIBRATION = [300, 150, 300, 150, 500];
const ESCALATION_AFTER_MS = 15 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function currentTime(now) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function currentDate(now) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function normalizeTime(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? `${pad(match[1])}:${match[2]}` : null;
}

function timingMatches(timing, now) {
  const times = Array.isArray(timing) ? timing : [timing];
  return times.some((time) => normalizeTime(time) === currentTime(now));
}

function matchingSubscriptions(type) {
  return store.pushSubscriptions.filter((entry) => entry.type === type);
}

async function notify(type, payload) {
  const subscriptions = matchingSubscriptions(type);
  const results = await Promise.allSettled(
    subscriptions.map((entry) => sendPushNotification(entry.subscription, payload))
  );
  results.forEach((result) => {
    if (result.status === 'rejected') console.error('Push notification failed:', result.reason.message);
  });
}

function addReminder({ sourceType, sourceId, scheduledFor, personName, medicineName, eventTitle, firedAt }) {
  const reminder = {
    id: crypto.randomUUID(),
    sourceType,
    sourceId,
    scheduledFor,
    personName,
    medicineName,
    eventTitle,
    firedAt: firedAt.toISOString(),
    confirmedAt: null,
    escalated: false
  };
  store.reminders.push(reminder);
  return reminder;
}

function alreadyFired(sourceType, sourceId, scheduledFor) {
  return store.reminders.some(
    (reminder) =>
      reminder.sourceType === sourceType &&
      reminder.sourceId === sourceId &&
      reminder.scheduledFor === scheduledFor
  );
}

function medicineMessage(medicine) {
  return medicine.translatedReminderText || medicine.translatedReminder || medicine.translatedText || medicine.reminderText ||
    `It is time to take your ${medicine.name}.`;
}

async function fireMedicineReminders(now) {
  const time = currentTime(now);
  const date = currentDate(now);
  for (const medicine of store.medicines) {
    if (!medicine.confirmed || !timingMatches(medicine.timing, now)) continue;

    const sourceId = String(medicine.id || medicine.name);
    const scheduledFor = `${date}T${time}`;
    if (alreadyFired('medicine', sourceId, scheduledFor)) continue;

    await notify('elder', {
      title: 'Medicine reminder',
      body: medicineMessage(medicine),
      vibrate: ELDER_VIBRATION,
      data: { reminderType: 'medicine', medicineId: medicine.id }
    });
    addReminder({
      sourceType: 'medicine',
      sourceId,
      scheduledFor,
      personName: medicine.personName || store.personName || 'They',
      medicineName: medicine.name,
      firedAt: now
    });
  }
}

function eventDate(event) {
  const value = event.start || event.startTime || event.dateTime || event.date;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function eventAlarmForNow(event, now) {
  const start = eventDate(event);
  if (!start) return null;
  const today = currentDate(now);
  const startDay = currentDate(start);
  const dayBefore = new Date(start);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayBeforeDay = currentDate(dayBefore);

  if (today === startDay && timingMatches(event.dayOfAlarmTiming || event.alarmTiming || event.timing, now)) {
    return 'day-of';
  }
  if (today === dayBeforeDay && timingMatches(event.dayBeforeAlarmTiming || event.dayBeforeTiming, now)) {
    return 'day-before';
  }
  return null;
}

async function fireEventReminders(now) {
  const time = currentTime(now);
  const date = currentDate(now);
  for (const event of store.events) {
    const alarmType = eventAlarmForNow(event, now);
    if (!alarmType) continue;

    const sourceId = String(event.id || event.title || event.name);
    const scheduledFor = `${date}T${time}:${alarmType}`;
    if (alreadyFired('event', sourceId, scheduledFor)) continue;

    const title = event.title || event.name || 'Upcoming event';
    const message = event.leaveByNudge || event.leaveByNudgeMessage || event.nudge ||
      `Reminder: ${title}.`;
    await notify('elder', {
      title: 'Event reminder',
      body: message,
      vibrate: ELDER_VIBRATION,
      data: { reminderType: 'event', eventId: event.id }
    });
    addReminder({
      sourceType: 'event',
      sourceId,
      scheduledFor,
      personName: event.personName || store.personName || 'They',
      eventTitle: title,
      firedAt: now
    });
  }
}

async function escalateUnconfirmedReminders(now) {
  for (const reminder of store.reminders) {
    if (reminder.confirmedAt || reminder.escalated) continue;
    if (now.valueOf() - new Date(reminder.firedAt).valueOf() < ESCALATION_AFTER_MS) continue;

    const body = reminder.sourceType === 'medicine'
      ? `${reminder.personName} has not confirmed taking ${reminder.medicineName}`
      : `${reminder.personName} has not confirmed the ${reminder.eventTitle} reminder.`;
    await notify('family', {
      title: 'Confirmation needed',
      body,
      vibrate: [250, 100, 250],
      data: { reminderId: reminder.id, reminderType: reminder.sourceType }
    });
    reminder.escalated = true;
    reminder.escalatedAt = now.toISOString();
  }
}

async function runScheduler(now = new Date()) {
  await fireMedicineReminders(now);
  await fireEventReminders(now);
  await escalateUnconfirmedReminders(now);
}

function confirmReminder(id) {
  const reminder = store.reminders.find((entry) => entry.id === id);
  if (!reminder) return null;
  reminder.confirmedAt = new Date().toISOString();
  return reminder;
}

function startScheduler() {
  return cron.schedule('* * * * *', () => {
    runScheduler().catch((error) => console.error('Reminder scheduler failed:', error));
  });
}

module.exports = { startScheduler, runScheduler, confirmReminder };
