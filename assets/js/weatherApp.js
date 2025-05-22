let apiKey;

async function fetchWeatherKey() {
  if (!apiKey) {
    const response = await fetch('/api/weather-key');
    const data = await response.json();
    apiKey = data.apiKey;
  }
  return apiKey;
}


window.onload = () => {
    // Select elements that will interact with HTML.
    const locationInput = document.getElementById('location'); // Input field for city or ZIP code.
    const fetchButton = document.getElementById('fetchButton'); // Button to fetch weather and music data.
    const toggleSyncModeButton = document.getElementById('toggleSyncMode'); // Button to toggle synchronous or asynchronous behavior.
    const loadingMessage = document.getElementById('loading'); // Div to display a loading message during fetch operations.
    const weatherDiv = document.getElementById('weather'); // Div to display weather information.
    const musicDiv = document.getElementById('music'); // Div to display music information.

    // Keep track of currently playing audio. Will use this to prevent overlapping streams.
    let currentAudio = null; // Store audio element for currently playing music.

    // Tracks if sync mode is enabled. This is designed to simulate synchronous behavior for project demonstration purposes.
    let syncMode = false; // Boolean to track current mode of operation.

    // Add a listener to toggle sync mode when button is clicked.
    toggleSyncModeButton.addEventListener('click', () => {
        syncMode = !syncMode; // Toggles sync mode between true and false.
        toggleSyncModeButton.textContent = syncMode ? 'Disable Sync Mode' : 'Enable Sync Mode'; // Updates button text to reflect current mode.
    });

    // Simulates a delay for sync mode. Used for demonstrating the difference between synchronous and asynchronous behavior.
    async function simulateDelay(ms) {
        if (syncMode) { // Adds a delay if sync mode is enabled.
            console.log(`Simulating delay of ${ms}ms due to sync mode.`); // Logs the delay being added.
            return new Promise(resolve => setTimeout(resolve, ms)); // Returns a promise that resolves after the specified delay.
        }
    }

    // Displays a loading message to the user. This lets them know that data is being fetched.
    function showLoading(message) {
        loadingMessage.style.display = 'block'; // Makes the loading message visible.
        loadingMessage.textContent = message; // Sets content of the loading message.
    }

    // Hide the loading message once data fetch is complete.
    function hideLoading() {
        loadingMessage.style.display = 'none'; // Hides the loading message.
    }

    // Fetch weather data. Include fallback for broader searches in cases where data is not found.
    async function fetchWeatherWithFallback(location) {
        await simulateDelay(2000); // Simulates a delay if sync mode is enabled.
        const apiKey = await fetchWeatherKey(); // API key for OpenWeather.
        let url, displayName, lat, lon; // Variables for the API URL, display name, latitude, and longitude.

        // Function to capitalize words. ThIS IS A WORK IN PROGRESS.  Does not handle country capitalization for uk to UK.  Return Uk.
        function capitalizeWords(str, isCountry = false) {
            if (typeof str !== 'string') return str; // Return input if it is not a string.
            if (isCountry) { // Special handling for country codes or names.
                if (str.length === 2 || str.length === 3) return str.toUpperCase(); // Converts country codes to uppercase.
                return str.split(' ') // Split full country names into words.
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word.
                        .join(' '); // Join the words back into a single string.
            }
            return str.split(' ') // Split strings into words.
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalizes each word.
                    .join(' '); // Joins the words back into a single string.
        }

        try {
            // Detects US ZIP codes (5 digits) and handles them specifically.
            if (/^\d{5}$/.test(location)) {
                const geoUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${location},US&appid=${apiKey}`;
                const geoResponse = await fetch(geoUrl); // Fetches geolocation data for the ZIP code.
                if (!geoResponse.ok) throw new Error(`No location found for ZIP code ${location}.`);
                const geoData = await geoResponse.json(); // Parses the response JSON.

                lat = geoData.lat; // Extracts latitude.
                lon = geoData.lon; // Extracts longitude.

                // Reverse geocodes to get city, state, and country names.
                const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&appid=${apiKey}`;
                const reverseGeoResponse = await fetch(reverseGeoUrl);
                const reverseGeoData = await reverseGeoResponse.json();

                if (reverseGeoResponse.ok && reverseGeoData.length > 0) {
                    const locationInfo = reverseGeoData[0];
                    const cityName = capitalizeWords(locationInfo.local_names?.en || locationInfo.name);
                    const stateName = capitalizeWords(locationInfo.state || '');
                    const countryName = capitalizeWords(locationInfo.country || '', true);

                    displayName = `${cityName}${stateName ? `, ${stateName}` : ''}${countryName ? `, ${countryName}` : ''}`;
                } else {
                    displayName = capitalizeWords(location); // Fall back to the original input if geocoding fails.
                }

                url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
            } else {
                // Handles city or country names.
                url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=imperial`;
                displayName = capitalizeWords(location); // Format the location input.
            }

            console.log(`Fetching weather for: ${displayName}`); // Log the location being fetched.
            console.log(`Request URL: ${url}`); // Log the request URL.

            const response = await fetch(url); // Fetche weather data.
            if (!response.ok) throw new Error('Weather data not found.');
            const weatherData = await response.json(); // Parse the response JSON.

            return { weatherData, displayName }; // Return the weather data and formatted display name.
        } catch (error) {
            console.error(`Primary fetch failed for location: ${location}`, error); // Log the error.
            throw new Error('Unable to fetch weather data. Please refine your input.'); // Provide a user-friendly error message.
        }
    }

    // Fetch the closest city based on latitude and longitude. To improve accuracy for ZIP codes.
    async function fetchClosestCity(lat, lon) {
        await simulateDelay(1000); // Simulate a delay if sync mode is enabled.
        const apiKey = await fetchWeatherKey(); // API key for OpenWeather.
        const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&appid=${apiKey}`; // URL to reverse geocode the coordinates.

        console.log(`Fetching closest city for coordinates: ${lat}, ${lon}`); // Log the coordinates being used.

        const response = await fetch(reverseGeoUrl); // Fetch reverse geocoding data.
        if (!response.ok) throw new Error('Failed to fetch closest city.'); // Throw an error if request fails.

        const nearbyLocations = await response.json(); // Parse response JSON.
        console.log('Nearby locations:', nearbyLocations); // Log nearby locations.

        // Iterate through results to find a city and state.
        for (const location of nearbyLocations) {
            if (location.name && location.state) {
                console.log(`Closest city found: ${location.name}, ${location.state}`); // Log selected city and state.
                return { city: location.name, state: location.state }; // Return city and state, if found.
            }
        }

        throw new Error('No suitable closest city found.'); // Throw an error if no valid city found.
    }

    // Fetch radio stations based on the provided city and state. Implements fallback logic for broader searches.
    async function fetchRadioStation(city, state) {
        await simulateDelay(3000); // Simulate a delay for sync mode.
        const queries = [ // THIS SECTION NEEDS IMPROVEMENT.  Same classical satation plays and want to randomize it some.
            `${city}, ${state}`, // Tries searching with both city and state.
            `${state}`, // Falls back to searching with just the state.
            "classical" // Defaults to classical music stations if other searches fail.
        ];

        for (const query of queries) {
            const url = `https://de1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(query)}`; // URL for fetching radio stations.
            console.log(`Fetching radio stations for query: ${query}`); // Log the query being searched.

            try {
                const response = await fetch(url); // Fetch data for the query.
                if (!response.ok) throw new Error(`Failed to fetch radio stations for "${query}"`); // Throws an error if request fails.

                const stations = await response.json(); // Parse the response JSON.
                console.log(`Radio Browser API results for "${query}":`, stations); // Log the fetched stations.

                // Find first valid station and separate the rest as fallback options.
                const firstStation = stations.find(station => station.url_resolved); // Find first station with a resolved URL.
                const remainingStations = stations.filter(station => station.url_resolved && station !== firstStation); // Filter remaining stations.

                if (firstStation) {
                    return { firstStation, remainingStations }; // Return first station and fallback stations.
                } else {
                    console.warn(`No stations found for "${query}"`); // Log a warning if no stations found for query.
                }
            } catch (error) {
                console.error(`Error fetching radio stations for "${query}":`, error); // Log any errors during fetch.
            }
        }
        throw new Error('No playable stations found for any query.'); // Throw error if all queries fail.
    }   


    // Play selected radio station. Includes error handling and fallback logic for playback issues.
    async function playRadioStation(station, remainingStations = []) {
        if (!station || !station.url) { // Check if station or URL is invalid.
            console.error('Station or URL is invalid:', station); // Log issue.
            musicDiv.innerHTML = `<h2>Now Playing</h2><p>Error: No valid station available to play.</p>`; // Display error message in the UI.
            return; // Stop execution if no valid station provided.
        }

        console.log(`Attempting to play station: ${station.name}`); // Log station being played.

        // Reuse/create audio element for playback.
        let audioElement = document.getElementById('audioPlayer'); // Look for existing audio player.
        if (!audioElement) { // If no audio player, create a new one.
            audioElement = document.createElement('audio'); // Create a new audio element.
            audioElement.id = 'audioPlayer'; // Set the ID of audio element.
            audioElement.controls = true; // Add playback controls.
            audioElement.autoplay = true; // Enable autoplay.
            audioElement.loop = true; // Enable looping playback.
            musicDiv.appendChild(audioElement); // Append audio player to music div.
            console.log('Created new audio element.'); // Log creation of new audio element.
        }

        try {
            if (audioElement.src !== station.url) { // Update source only if it's different.
                audioElement.src = station.url; // Set source URL for audio player.
                console.log(`Updated audio source to: ${station.url}`); // Log updated source URL.
            }

            await audioElement.play(); // Start playing audio.
            console.log(`Playing station: ${station.name}`); // Log that the station is playing.
            musicDiv.innerHTML = `
                <h2>Now Playing</h2>
                <p><strong>Station:</strong> ${station.name}</p>
                <p><strong>Stream:</strong> <a href="${station.url}" target="_blank">${station.url}</a></p>
                <audio id="audioPlayer" controls autoplay loop>
                    <source src="${station.url}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            `; // Update music div with station information and the audio player.
        } catch (error) {
            console.error(`Error playing station "${station.name}":`, error); // Log playback errors.

            if (remainingStations.length > 0) { // Check if there are fallback stations available.
                console.log('Trying the next station...'); // Log attempt to play next station.
                playRadioStation(remainingStations.shift(), remainingStations); // Play next station from fallback list.
            } else {
                console.warn('No more stations available.'); // Log that no stations are left to play.
                musicDiv.innerHTML = `<h2>Now Playing</h2><p>Error: No valid stations available for this location.</p>`; // Updates UI with error message.
            }
        }
    }

    // Add event listener for "Enter" key to trigger fetch.  NOTE - place outside fetchButton function or it won't work.
    locationInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { // Check if "Enter" key was pressed.
            fetchButton.click(); // Trigger click event on fetch button.
        }
    });

    // Event listener for fetch button.
    fetchButton.addEventListener('click', async () => {
        const location = locationInput.value.trim(); // Get value from input field and trim whitespace.

        if (!location) { // Check if input is empty.
            alert('Please enter a location!'); // Alert user to provide a location.
            return; // Exit function early if no input is provided.
        }

        if (currentAudio) { // Check if there is audio playing.
            currentAudio.pause(); // Pause currently playing audio.
            currentAudio.src = ''; // Clear source of current audio.
            currentAudio = null; // Reset current audio variable.
        }

        showLoading('Fetching weather and radio station...'); // Display a loading message while data is being fetched.

        try {
            const { weatherData, displayName } = await fetchWeatherWithFallback(location); // Fetch weather data and display name.
            const lat = weatherData.coord.lat; // Extract latitude from weather data.
            const lon = weatherData.coord.lon; // Extract longitude from weather data.

            const weatherIcon = weatherData.weather[0].icon; // Get weather icon code.
            const weatherIconUrl = `assets/custom-icons/${weatherIcon}.png`; // Construct URL for the custom weather icon.
            const weatherDescription = weatherData.weather[0].description; // Get weather description.

            // Update weather div with fetched weather data.
            weatherDiv.innerHTML = `
            <h2>Weather</h2>
            <p><strong>Location:</strong> ${displayName}</p>
            <p><strong>Temperature:</strong> ${weatherData.main.temp}°F</p>
            <p><strong>Condition:</strong> ${weatherData.weather[0].main}</p>
            <img src="${weatherIconUrl}" alt="${weatherDescription}" title="${weatherDescription}" />
            `;

            const { firstStation, remainingStations } = await fetchRadioStation(displayName.split(',')[0], displayName.split(',')[1] || ''); // Fetches radio stations based on location.
            playRadioStation(firstStation, remainingStations); // Play first valid station.
        } catch (error) {
            console.error('Error:', error); // Log any errors encountered during fetch or playback process.
            weatherDiv.innerHTML = '<h2>Weather</h2><p>Error fetching weather data. Please try again.</p>'; // Display error message for weather data.
            musicDiv.innerHTML = '<h2>Now Playing</h2><p>Error fetching radio station.</p>'; // Display error message for radio stations.
        } finally {
            hideLoading(); // Hide loading message when done.
        }
    });
};