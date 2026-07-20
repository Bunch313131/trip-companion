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
  // Extras, present only in detail mode:
  precipSum?: number | null; // mm
  windMax?: number | null; // km/h
  uvMax?: number | null;
  sunrise?: string | null; // ISO local
  sunset?: string | null; // ISO local
  feelsMax?: number | null; // °C
  feelsMin?: number | null; // °C
};

export type WeatherResponse = {
  days: WeatherDay[];
  /** true when the requested date is beyond Open-Meteo's forecast horizon. */
  outOfRange?: boolean;
};

export type WeatherHour = {
  time: string; // ISO local
  temp: number; // °C
  precipProb: number | null; // %
  code: number;
};

/** Richer payload for the tap-through detail view. */
export type WeatherDetailResponse = {
  days: WeatherDay[];
  hours: WeatherHour[];
  current: { temp: number; feels: number; code: number } | null;
  timezone: string;
  outOfRange?: boolean;
};

/** One stop's forecast for the day you'll be there — the trip outlook. */
export type TripStopForecast = { id: string; city: string; date: string; day: WeatherDay | null };
export type TripWeatherResponse = { stops: TripStopForecast[] };

/** A stop to request in the trip outlook. */
export type TripStopInput = { id: string; city: string; lat: number; lng: number; date: string };

export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

/** "3 PM" from an ISO local time string (no timezone conversion — Open-Meteo
 *  already returns times in the location's zone). */
export function fmtHour(iso: string): string {
  const h = Number(iso.slice(11, 13));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}

/** "Mon" from a YYYY-MM-DD string, in local calendar terms. */
export function fmtDow(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}
