/**
 * WMO weather-code interpretation for Open-Meteo. Maps the numeric code to a
 * short label and a matching emoji so the UI stays dependency-free.
 */

export type WeatherCode = { label: string; emoji: string };

export function weatherCode(code: number | null | undefined): WeatherCode {
  switch (code) {
    case 0:
      return { label: 'Clear', emoji: '☀️' };
    case 1:
      return { label: 'Mostly clear', emoji: '🌤️' };
    case 2:
      return { label: 'Partly cloudy', emoji: '⛅' };
    case 3:
      return { label: 'Overcast', emoji: '☁️' };
    case 45:
    case 48:
      return { label: 'Fog', emoji: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { label: 'Drizzle', emoji: '🌦️' };
    case 56:
    case 57:
      return { label: 'Freezing drizzle', emoji: '🌧️' };
    case 61:
    case 63:
    case 65:
      return { label: 'Rain', emoji: '🌧️' };
    case 66:
    case 67:
      return { label: 'Freezing rain', emoji: '🌧️' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: 'Snow', emoji: '🌨️' };
    case 80:
    case 81:
    case 82:
      return { label: 'Showers', emoji: '🌦️' };
    case 85:
    case 86:
      return { label: 'Snow showers', emoji: '🌨️' };
    case 95:
      return { label: 'Thunderstorm', emoji: '⛈️' };
    case 96:
    case 99:
      return { label: 'Thunderstorm', emoji: '⛈️' };
    default:
      return { label: '—', emoji: '🌡️' };
  }
}

/** Shape returned by /api/weather. */
export type WeatherDay = {
  date: string; // YYYY-MM-DD
  code: number;
  tempMax: number; // °C
  tempMin: number; // °C
  precipProb: number | null; // %
};

export type WeatherResponse = {
  days: WeatherDay[];
  /** true when the requested date is beyond Open-Meteo's forecast horizon. */
  outOfRange?: boolean;
};

export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}
