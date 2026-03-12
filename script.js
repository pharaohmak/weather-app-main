// Global state to store weather data for toggles (units/days)
let weatherData = null;

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const unitSelect = document.getElementById('units');

    // Initial load with a default city
    getCoordinates("Berlin");

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = document.getElementById('city-search').value;
        if (city) getCoordinates(city);
    });

    unitSelect.addEventListener('change', () => {
        // Refresh data to get correct units from the API server
        const city = document.getElementById('current-city').textContent.split(',')[0];
        getCoordinates(city);
    });
});

/**
 * Step 1: Convert City Name to Latitude/Longitude
 */
async function getCoordinates(cityName) {
    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const response = await fetch(geoUrl);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            alert("City not found. Please try again.");
            return;
        }

        const { latitude, longitude, name, country } = data.results[0];
        document.getElementById('current-city').textContent = `${name}, ${country}`;
        
        fetchWeatherData(latitude, longitude);
    } catch (error) {
        console.error("Geocoding error:", error);
    }
}

/**
 * Step 2: Fetch Weather Data using Coordinates
 */
async function fetchWeatherData(lat, lon) {
    const units = document.getElementById('units').value;
    const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
    const windUnit = units === 'imperial' ? 'mph' : 'kmh';
    const precipUnit = units === 'imperial' ? 'inch' : 'mm';

    // API URL with all required parameters for current, hourly, and daily data
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,time&daily=weather_code,temperature_2m_max,temperature_2m_min,time&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}&timezone=auto`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("API URL:", url);
            throw new Error("Weather data fetch failed");
        }
        
        weatherData = await response.json();
        updateUI(weatherData, units);
    } catch (error) {
        console.error("Weather fetch error:", error);
    }
}

/**
 * Step 3: Update the User Interface
 */
function updateUI(data, unitType) {
    const isImperial = unitType === 'imperial';
    const tLabel = isImperial ? '°F' : '°C';
    const sLabel = isImperial ? ' mph' : ' km/h';

    // Update Current Weather Card
    document.getElementById('temp-value').textContent = `${Math.round(data.current.temperature_2m)}${tLabel}`;
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Update Stats Grid
    document.getElementById('feels-like').textContent = `${Math.round(data.current.apparent_temperature)}${tLabel}`;
    document.getElementById('humidity').textContent = `${data.current.relative_humidity_2m}%`;
    document.getElementById('wind').textContent = `${data.current.wind_speed_10m}${sLabel}`;
    document.getElementById('precip').textContent = `${data.current.precipitation} ${isImperial ? 'in' : 'mm'}`;

    // Update Daily Forecast (7 Days)
    const dailyContainer = document.getElementById('daily-list');
    dailyContainer.innerHTML = '';
    
    data.daily.time.forEach((time, i) => {
        const dayName = new Date(time).toLocaleDateString('en-US', { weekday: 'short' });
        const card = document.createElement('div');
        card.className = 'daily-card';
        card.innerHTML = `
            <p>${dayName}</p>
            <img src="./assets/images/icon-sunny.webp" alt="Weather Icon">
            <span>
                <p><strong>${Math.round(data.daily.temperature_2m_max[i])}°</strong></p>
                <p>${Math.round(data.daily.temperature_2m_min[i])}°</p>
            </span>
        `;
        dailyContainer.appendChild(card);
    });

    // Initial Hourly Display (Today)
    displayHourly(data, 0);
}

/**
 * Step 4: Display Hourly Data for Selected Day
 */
function displayHourly(data, dayOffset) {
    const hourlyContainer = document.getElementById('hourly-list');
    hourlyContainer.innerHTML = '';
    
    const startIndex = dayOffset * 24;
    const endIndex = startIndex + 24;
    const isImperial = document.getElementById('units').value === 'imperial';

    for (let i = startIndex; i < endIndex && i < data.hourly.temperature_2m.length; i++) {
        const time = new Date(data.hourly.time[i]);
        const hour = time.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;

        const row = document.createElement('div');
        row.className = 'hourly-card';
        row.innerHTML = `
            <span>
                <img src="./assets/images/icon-sunny.webp" alt="Icon">
                <p>${displayHour} ${ampm}</p>
            </span>
            <p><strong>${Math.round(data.hourly.temperature_2m[i])}${isImperial ? '°F' : '°C'}</strong></p>
        `;
        hourlyContainer.appendChild(row);
    }
}
