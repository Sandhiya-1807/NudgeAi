const axios = require('axios');

// Mock data stays enabled until a real API integration is explicitly requested.
const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

async function getTravelTimeMinutes(destination) {
  if (USE_MOCK_DATA) {
    return 25;
  }

  if (!destination) {
    throw new Error('A destination is required to calculate travel time.');
  }

  const origin = `${process.env.HOME_LAT},${process.env.HOME_LNG}`;
  const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
    params: {
      origins: origin,
      destinations: destination,
      departure_time: 'now',
      mode: 'driving',
      key: process.env.GOOGLE_MAPS_API_KEY
    }
  });

  if (data.status !== 'OK') {
    throw new Error(`Google Maps request failed: ${data.status}`);
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`Unable to calculate travel time: ${element?.status || 'unknown error'}`);
  }

  const durationSeconds = element.duration_in_traffic?.value || element.duration?.value;
  return Math.ceil(durationSeconds / 60);
}

function computeLeaveByTime(eventStartTime, travelMinutes, bufferMinutes = 10) {
  const eventTime = new Date(eventStartTime);
  if (Number.isNaN(eventTime.getTime())) {
    throw new Error('eventStartTime must be a valid date or ISO timestamp.');
  }

  if (!Number.isFinite(travelMinutes) || travelMinutes < 0) {
    throw new Error('travelMinutes must be a non-negative number.');
  }

  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) {
    throw new Error('bufferMinutes must be a non-negative number.');
  }

  return new Date(eventTime.getTime() - (travelMinutes + bufferMinutes) * 60 * 1000).toISOString();
}

module.exports = {
  computeLeaveByTime,
  getTravelTimeMinutes
};
