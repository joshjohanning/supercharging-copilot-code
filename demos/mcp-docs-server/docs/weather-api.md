# Weather API Integration

## Overview

We use OpenWeatherMap API to provide weather data for location-based features.

## Setup

1. Get API key from OpenWeatherMap: https://openweathermap.org/api
2. VS Code will prompt for the API key when the MCP server starts (stored encrypted)
3. Base URL: `https://api.openweathermap.org/data/2.5/weather`

## Usage Examples

```javascript
// Get weather by city
const response = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`,
);

// Get weather by coordinates
const response = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
);
```

## Response Format

```json
{
  "weather": [{ "main": "Clear", "description": "clear sky" }],
  "main": { "temp": 22.5, "feels_like": 21.8, "humidity": 65 },
  "wind": { "speed": 3.2, "deg": 180 },
  "name": "Amsterdam"
}
```
