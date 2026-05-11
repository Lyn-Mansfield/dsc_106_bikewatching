// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = "pk.eyJ1IjoibHluLW1hbnNmaWVsZCIsImEiOiJjbXAxb2t5NTAwN2t2MnVvYW1tNTNkMjVlIn0.40k7nOKa_SjOcBuS1QJ6ww";

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/dark-v11', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum allowed zoom
    maxZoom: 18, // Maximum allowed zoom
});

map.on('load', async () => {
    map.addSource('boston_route', {
        type: 'geojson',
        data: "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson",
    });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',  // A bright green using hex code
            'line-width': 5,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
        }
    });

    let jsonData;
    try {
        const jsonUrl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";

        // Await JSON fetch
        jsonData = await d3.json(jsonUrl);

        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }
    let stations = jsonData.data.stations;
    const svg = d3.select('#map').select('svg');
    // Append circles to the SVG for each station
    const circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5) // Radius of the circle
        .attr('fill', 'steelblue') // Circle fill color
        .attr('stroke', 'white') // Circle border color
        .attr('stroke-width', 1) // Circle border thickness
        .attr('opacity', 0.8); // Circle opacity
    // Initial position update when map loads
    updatePositions();

    // Function to update circle positions when the map moves/zooms
    function updatePositions() {
        circles
            .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
            .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
    }

    // Reposition markers on map interactions
    map.on('move', updatePositions); // Update during map movement
    map.on('zoom', updatePositions); // Update during zooming
    map.on('resize', updatePositions); // Update on window resize
    map.on('moveend', updatePositions); // Final adjustment after movement ends

    let trips;
    try {
        const csvUrl = "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv";

        // Await CSV fetch
        trips = await d3.csv(csvUrl);

        console.log('Loaded CSV Data:', trips); // Log to verify structure
    } catch (error) {
        console.error('Error loading CSV:', error); // Handle errors
    }
    const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id,
    );
    const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id,
    );

    stations = stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
        return station;
    });
    console.log('Stations with Traffic:', stations);
});

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point); // Project to pixel coordinates
    return { cx: x, cy: y }; // Return as object for use in SVG attributes
}