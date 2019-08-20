const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors());

/*
[
  {
    "forecast": "Partly cloudy until afternoon.",
    "time": "Mon Jan 01 2001"
  },
  {
    "forecast": "Mostly cloudy in the morning.",
    "time": "Tue Jan 02 2001"
  },
  ...
]

*/

class Weather {
  constructor(json) {
    let weathers = [];
    for (const day of json['daily']['data']) {
      const date = new Date(day.time * 1000);
      weathers.push({
        'forecast': day.summary,
        'time': date.toString().slice(0, 15),
      });
    }
    this.weather = weathers;
  }
}

console.log('Hello?');

class Location {

  constructor(query, json) {
    this.search_query = query;
    this.formatted_query = json.results[0].formatted_address;
    this.latitude = json.results[0].geometry.location.lat;
    this.longitude = json.results[0].geometry.location.lng;
  }
}

const geoData = require('./data/geo.json');
const weatherData = require('./data/darksky.json');

app.get('/location', (req, res) => {
  try {
    const location = new Location(req.query.location, geoData);
    res.send(JSON.stringify(location));
  } catch (error) {
    res.status(500).send({status: 500, responseText: error.message});
  }
});

app.get('/weather', (req, res) => {
  try {
    const weather = new Weather(weatherData);
    res.send(JSON.stringify(weather.weather));
  } catch (error) {
    res.status(500).send({status: 500, responseText: error.message});
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Server has started...');
});
