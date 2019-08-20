const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors());

const getErrorMessage = function (error) {
  return `<style>*{text-align:center;background-color:#222222;color:#AFAFAF}h1{font-size:500%;}p{font-size:300%;}</style><h1>Woops, dude!</h1><p>${error.message}, you've really goofed this time!</p>`;
};

class Location {

  constructor(query, json) {
    this.search_query = query;
    this.formatted_query = json.results[0].formatted_address;
    this.latitude = json.results[0].geometry.location.lat;
    this.longitude = json.results[0].geometry.location.lng;
  }
}

const geoData = require('./data/geo.json');

app.get('/location', (req, res) => {
  try {
    const location = new Location(req.query.location, geoData);
    res.send(JSON.stringify(location));
  } catch (error) {
    res.status(500).send(getErrorMessage(error));
  }
});

app.get('/weather', (req, res) => {
  res.send(req.path + JSON.stringify(req.query['place']));
});

app.get(/.*/, (req, res) => {
  res.status(404).send('Woops, you\'ve taken a wrong turn!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Server has started...');
});
