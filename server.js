'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const superagent = require('superagent');
const pg = require('pg');

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

const app = express();
app.use(cors());

function convertTime(timeInMilliseconds) {
  return new Date(timeInMilliseconds).toString().split(' ').slice(0, 4).join(' ');
}

function Location(query, formatted, lat, long) {
  this.search_query = query;
  this.formatted_query = formatted;
  this.latitude = lat;
  this.longitude = long;
}

function Weather(weatherData) {
  this.forecast = weatherData.summary || weatherData.forecast;
  this.time = isNaN(weatherData.time) ? weatherData.time : convertTime(weatherData.time * 1000);
}

function Event(eventData) {
  this.link = eventData.url || eventData.link;
  this.name = eventData.name.text ? eventData.name.text : eventData.name;
  this.event_date = eventData.start ? eventData.start.local : eventData.event_date;
  this.summary = eventData.description ? eventData.description.text : eventData.summary;
}

function queryData(query, values, onNotExist, onExist, onError) {
  client.query(query, values).then(results => {
    if (results.rows.length === 0) {
      onNotExist();
    } else {
      onExist(results);
    }
  }).catch((error) => onError(error));
}

function handleError(error, response) {
  response.status(error.status || 500).send(error.message);
}

app.get('/location', (request, response) => {
  const query = 'SELECT * FROM locations WHERE search_query=$1;';
  const values = [request.query.data];

  queryData(query, values,
    () => handleNewLocationData(request.query.data, response),
    (results) => handleTerryFold(results, request.query.data, response),
    (error) => handleError(error, response)
  );

  //MuTHER F\/<KING REFACTORED MUTHER B!TCH3S!! 
});

function handleTerryFold(results, searchTerm, response) {
  const location = new Location(searchTerm, results.rows[0].formatted_query, results.rows[0].latitude, results.rows[0].longitude);
  response.send(location);
}

function handleNewLocationData(searchTerm, response) {
  superagent.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${searchTerm}&key=${process.env.GEOCODE_API_KEY}`)
    .then((locationData) => {
      const location = new Location(searchTerm, locationData.body.results[0].formatted_address, locationData.body.results[0].geometry.location.lat, locationData.body.results[0].geometry.location.lng);
      const query = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
      const values = Object.values(location);
      client.query(query, values).catch((...args) => console.log(args));
      response.send(location);
    })
    .catch((error) => handleError(error, response));
}


app.get('/events', (request, response) => {
  const query = 'SELECT * FROM events WHERE latitude=$1 AND longitude=$2;';
  const values = [request.query.data.latitude, request.query.data.longitude];
  queryData(query, values,
    () => handleNewEventData(request.query.data.latitude, request.query.data.longitude, response),
    (results) => handleOldEventData(results, response),
    (error) => handleError(error, response)
  );
});

app.get('/weather', (request, response) => {
  const query = 'SELECT * FROM weather WHERE latitude=$1 AND longitude=$2;';
  const values = [request.query.data.latitude, request.query.data.longitude];
  queryData(query, values,
    () => handleNewWeatherData(request.query.data.latitude, request.query.data.longitude, response),
    (results) => handleOldWeatherData(results, response),
    (error) => handleError(error, response));
});

app.get(/.*/, (req, res) => {
  res.status(404).send({ status: 404, responseText: 'This item could not be found..' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('I know that you came to party baby, baby, baby, baby');
});

function handleNewWeatherData(latitude, longitude, response) {
  superagent
    .get(`https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${latitude},${longitude}`)
    .then((weatherData) => {
      const weather = weatherData.body.daily.data.map((day) => new Weather(day));
      const query = 'INSERT INTO weather (forecast, time, latitude, longitude) VALUES ($1, $2, $3, $4)';
      weather.forEach(day => {
        const values = [day.forecast, day.time, latitude, longitude];
        client.query(query, values).catch((...args) => console.log(args));
      });
      response.send(weather);
    })
    .catch((error) => handleError(error, response));
}

function handleOldWeatherData(results, response) {
  response.send(results.rows.map(day => {
    return new Weather(day);
  }));
}

function handleNewEventData(latitude, longitude, response) {
  superagent
    .get(`https://www.eventbriteapi.com/v3/events/search/?token=${process.env.EVENTBRITE_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}&location.within=10km`)
    .then((eventData) => {
      const sliceIndex = eventData.body.events.length > 20 ? 20 : eventData.body.events.length;
      const events = eventData.body.events.slice(0, sliceIndex).map((event) => new Event(event));

      const query = 'INSERT INTO events (name, event_date, link, summary, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6)';
      events.forEach(event => {
        const values = [event.name, event.event_date, event.link, event.summary, latitude, longitude];
        client.query(query, values).catch((...args) => console.log(args));
      });
      response.send(events);
    })
    .catch((error) => handleError(error, response));
}

function handleOldEventData(results, response) {
  const events = results.rows.map(event => new Event(event));
  response.send(events);
}