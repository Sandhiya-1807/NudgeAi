const axios = require('axios');

// Mock data stays enabled until a real API integration is explicitly requested.
const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

function createAdvisory(condition, tempC) {
  const normalizedCondition = condition.toLowerCase();

  if (normalizedCondition.includes('rain') || normalizedCondition.includes('thunderstorm')) {
    return 'Rain is expected; bring an umbrella and allow extra travel time.';
  }

  if (tempC >= 32) {
    return 'It will be hot; stay hydrated and consider sun protection.';
  }

  if (tempC <= 10) {
    return 'It will be chilly; bring a warm layer.';
  }

  return 'Weather conditions look comfortable for your plans.';
}

async function getWeatherAdvisory() {
  if (USE_MOCK_DATA) {
    const condition = 'Partly cloudy';
    const tempC = 27;
    return { condition, tempC, advisory: createAdvisory(condition, tempC) };
  }

  const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      lat: process.env.HOME_LAT,
      lon: process.env.HOME_LNG,
      units: 'metric',
      appid: process.env.OPENWEATHER_API_KEY
    }
  });

  const condition = data.weather?.[0]?.description || 'Unknown';
  const tempC = data.main?.temp;

  if (!Number.isFinite(tempC)) {
    throw new Error('OpenWeatherMap did not return a temperature.');
  }

  return { condition, tempC, advisory: createAdvisory(condition, tempC) };
}

module.exports = {
  getWeatherAdvisory
};
