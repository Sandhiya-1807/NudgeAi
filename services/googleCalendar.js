const { google } = require('googleapis');

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
// Mock data is enabled unless explicitly disabled for a real OAuth connection.
const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

let oauth2Client;

function getOAuth2Client() {
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  return oauth2Client;
}

function getAuthUrl() {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: [CALENDAR_SCOPE],
    prompt: 'consent'
  });
}

async function setTokenFromCode(code) {
  const { tokens } = await getOAuth2Client().getToken(code);
  getOAuth2Client().setCredentials(tokens);
  return tokens;
}

function getMockEvents() {
  const now = new Date();
  const inHours = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

  return [
    ['mock-1', 'Team stand-up', 2, 'Google Meet'],
    ['mock-2', 'Product planning', 5, 'Conference Room A'],
    ['mock-3', 'Lunch with Maya', 28, 'Olive Bistro'],
    ['mock-4', 'Dentist appointment', 52, 'Smile Dental Clinic'],
    ['mock-5', 'Project NudgeAI review', 75, 'Google Meet'],
    ['mock-6', 'Gym session', 98, 'FitHub, Main Street'],
    ['mock-7', 'Design sync', 124, 'Zoom'],
    ['mock-8', 'Grocery pickup', 148, 'Fresh Market'],
    ['mock-9', 'Client presentation', 172, 'Client HQ'],
    ['mock-10', 'Weekly reflection', 196, 'Home']
  ].map(([id, title, hours, location]) => ({ id, title, startTime: inHours(hours), location }));
}

async function fetchUpcomingEvents() {
  if (USE_MOCK_DATA) {
    return getMockEvents();
  }

  const client = getOAuth2Client();
  if (!client.credentials.access_token) {
    throw new Error('Google Calendar is not connected. Exchange an OAuth authorization code first.');
  }

  const calendar = google.calendar({ version: 'v3', auth: client });
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  });

  return (data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || 'Untitled event',
    startTime: event.start?.dateTime || event.start?.date || null,
    location: event.location || null
  }));
}

module.exports = {
  fetchUpcomingEvents,
  getAuthUrl,
  setTokenFromCode
};
