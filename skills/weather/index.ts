import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import { execSync } from 'node:child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Open-Meteo — primary API (no API key, no rate limit, accessible in China)
// ─────────────────────────────────────────────────────────────────────────────
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL  = 'https://api.open-meteo.com/v1/forecast';

/**
 * Executes a network request using curl.
 * Curl is more robust in many environments (respects system proxies, stable TLS).
 */
function curlGet(url: string, timeoutSec: number = 30): string {
    console.log(`[Weather] Executing curl: ${url}`);
    try {
        // -s: silent
        // -L: follow redirects
        // -m: max time
        const command = `curl -s -L -m ${timeoutSec} "${url}"`;
        const output = execSync(command, { encoding: 'utf-8' });
        if (!output || output.trim() === '') {
            throw new Error('Empty response from curl');
        }
        return output;
    } catch (err: any) {
        console.error(`[Weather] Curl failed: ${err.message}`);
        throw new Error(`网络请求失败 (curl): ${err.message}`);
    }
}

/**
 * WMO weather interpretation codes → human-readable description
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
const WMO_DESCRIPTIONS: Record<number, string> = {
    0:  '晴朗 ☀️',
    1:  '大部晴朗 🌤️',  2: '局部多云 ⛅', 3: '阴天 ☁️',
    45: '有雾 🌫️',       48: '冻雾 🌫️',
    51: '小毛毛雨 🌦️',  53: '中毛毛雨 🌦️', 55: '大毛毛雨 🌦️',
    61: '小雨 🌧️',      63: '中雨 🌧️',    65: '大雨 🌧️',
    71: '小雪 🌨️',      73: '中雪 🌨️',    75: '大雪 ❄️',
    77: '冰粒 🌨️',
    80: '小阵雨 🌦️',   81: '中阵雨 🌦️',  82: '强阵雨 🌦️',
    85: '小阵雪 🌨️',   86: '强阵雪 ❄️',
    95: '雷暴 ⛈️',     96: '雷暴伴冰雹 ⛈️', 99: '强雷暴伴冰雹 ⛈️',
};

function wmoDesc(code: number): string {
    return WMO_DESCRIPTIONS[code] ?? `(WMO ${code})`;
}

interface GeoResult {
    latitude: number;
    longitude: number;
    name: string;
    country: string;
    timezone: string;
}

async function geocode(location: string): Promise<GeoResult> {
    const url = `${GEOCODING_URL}?name=${encodeURIComponent(location)}&count=1&language=zh&format=json`;
    const output = curlGet(url);
    const data = JSON.parse(output);
    if (!data.results?.length) throw new Error(`找不到地点 "${location}"，请检查城市名称是否正确`);
    const r = data.results[0];
    return {
        latitude: r.latitude,
        longitude: r.longitude,
        name: r.name,
        country: r.country,
        timezone: r.timezone || 'Asia/Shanghai',
    };
}

/**
 * Query current weather (hourly snapshot of the present hour)
 */
async function fetchCurrentWeather(geo: GeoResult): Promise<string> {
    const params = new URLSearchParams({
        latitude:  String(geo.latitude),
        longitude: String(geo.longitude),
        current:   'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode,precipitation',
        timezone:  geo.timezone,
    });
    const output = curlGet(`${FORECAST_URL}?${params}`);
    const data = JSON.parse(output);
    const c = data.current;
    return [
        `📍 ${geo.name}, ${geo.country} — 当前天气`,
        `天气：${wmoDesc(c.weathercode)}`,
        `气温：${c.temperature_2m}°C（体感 ${c.apparent_temperature}°C）`,
        `湿度：${c.relative_humidity_2m}%`,
        `风速：${c.wind_speed_10m} km/h`,
        `降水：${c.precipitation} mm`,
    ].join('\n');
}

/**
 * Query N-day daily forecast
 */
async function fetchDailyForecast(geo: GeoResult, days: number): Promise<string> {
    const params = new URLSearchParams({
        latitude:   String(geo.latitude),
        longitude:  String(geo.longitude),
        daily:      'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
        timezone:   geo.timezone,
        forecast_days: String(days),
    });
    const output = curlGet(`${FORECAST_URL}?${params}`);
    const data = JSON.parse(output);
    const d = data.daily;
    const lines: string[] = [`📍 ${geo.name}, ${geo.country} — ${days} 天预报\n`];
    for (let i = 0; i < d.time.length; i++) {
        lines.push(
            `${d.time[i]}  ${wmoDesc(d.weathercode[i])}` +
            `  🌡 ${d.temperature_2m_min[i]}~${d.temperature_2m_max[i]}°C` +
            `  💧 ${d.precipitation_sum[i]}mm  💨 ${d.wind_speed_10m_max[i]}km/h`
        );
    }
    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// FunctionTool export
// ─────────────────────────────────────────────────────────────────────────────
export const weatherTool = new FunctionTool({
    name: 'get_weather',
    description:
        'Get current weather and multi-day forecasts for any city or location. ' +
        'Powered by Open-Meteo (free, no API key, works in China). ' +
        'Use when the user asks about weather, temperature, rain, or forecast.',
    parameters: z.object({
        location: z
            .string()
            .describe(
                '城市名或地点，支持中文和英文。例如：上海、北京、Tokyo、New York。',
            ),
        type: z
            .enum(['current', 'forecast3d', 'forecast7d'])
            .optional()
            .default('forecast3d')
            .describe(
                '查询类型：\n' +
                '  current    — 当前天气\n' +
                '  forecast3d — 3 天预报（默认）\n' +
                '  forecast7d — 7 天预报',
            ),
    }),
    execute: async ({ location, type = 'forecast3d' }) => {
        try {
            const geo = await geocode(location);

            let result: string;
            switch (type) {
                case 'current':
                    result = await fetchCurrentWeather(geo);
                    break;
                case 'forecast7d':
                    result = await fetchDailyForecast(geo, 7);
                    break;
                case 'forecast3d':
                default:
                    result = await fetchDailyForecast(geo, 3);
                    break;
            }

            return { status: 'success', location: geo.name, country: geo.country, type, result };
        } catch (error: any) {
            console.error(`[Weather] Tool error for "${location}":`, error);
            return {
                status: 'error',
                location: location,
                message: `查询天气失败: ${error?.message ?? '未知错误'}`,
            };
        }
    },
});
