import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import { getCityCode } from './cityCodes.js';

export const weatherTool = new FunctionTool({
    name: 'weather_tool',
    description:
        '获取中国城市的实时天气情况。' +
        '当用户询问某个国内城市的天气、温度或风速时触发。',
    parameters: z.object({
        location: z.string().describe('中国城市名称 (如 "上海", "北京", "深圳")'),
    }),
    execute: async ({ location }) => {
        try {
            // Step 1: 获取九位城市气象代码
            const cityCode = getCityCode(location);
            if (!cityCode) {
                return {
                    status: 'error',
                    location,
                    message: `抱歉，国内天气服务暂不支持城市：${location}。目前仅支持全国主要一二线及省会城市。`,
                };
            }

            // Step 2: 请求 SOJSON 天气接口 (中国境内优化)
            const weatherRes = await fetch(`http://t.weather.sojson.com/api/weather/city/${cityCode}`);
            if (!weatherRes.ok) {
                throw new Error(`国内天气 API 请求失败: HTTP ${weatherRes.status}`);
            }

            const weatherData = await weatherRes.json();

            // 检查业务层状态码
            if (weatherData.status !== 200) {
                throw new Error(`获取天气数据失败: ${weatherData.message || '未知错误'}`);
            }

            const data = weatherData.data;
            const today = data.forecast[0];

            return {
                status: 'success',
                target_location: weatherData.cityInfo.city,
                current_weather: {
                    temperature: `${data.wendu}°C`,
                    humidity: data.shidu,
                    air_quality: data.quality,
                    pm25: data.pm25,
                    today_forecast: {
                        condition: today.type,
                        high: today.high,
                        low: today.low,
                        wind: `${today.fx} ${today.fl}`
                    },
                    health_advice: data.ganmao // 感冒提示或健康指引
                },
                source: "Sojson Meteorological Data",
                note: "请用中文并带有感情地将查到的气温、天气状况和空气质量汇报给用户，并可以附上返回的 health_advice (感冒/健康指引)。"
            };
        } catch (error: any) {
            return {
                status: 'error',
                location,
                message: `天气查询异常: ${error?.message || '未知网络错误'}`,
            };
        }
    },
});
