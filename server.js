//CLASS CODE
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

app.get('/location', getLocation);
app.get('/events', getEvents);
app.get('/weather', getWeather);
app.get('/yelp', getYelps);
app.get('/movies', getMovies); 

const timeouts = {
  weather: 15000,
  yelp: 15000,
  movies: 15000,
  events: 15000,
};


function convertTime(timeInMilliseconds) {
  return new Date(timeInMilliseconds).toString().slice(0, 15);
}

function Location(query,geoData) {
  this.search_query = query;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

Location.prototype.save = function(){
  const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`;
  const VALUES = [this.search_query, this.formatted_query, this.latitude, this.longitude];

  return client.query(SQL, VALUES).then(result => {
    this.id = result.rows[0].id;
    return this;
  })
}

function Weather(weatherData) {
  this.created_at = Date.now();
  this.forecast = weatherData.summary;
  this.time = convertTime(weatherData.time * 1000);
}

Weather.prototype.save = function(location_id){
  const SQL = `INSERT INTO weather (forecast, time, created_at, location_id) VALUES($1, $2, $3, $4)`;

  const VALUES = [this.forecast, this.time, this.created_at, location_id];

  client.query(SQL, VALUES);
}

function Event(query, url, name, date, summary) {
  this.search_query = query;
  this.created_at = Date.now();
  this.link = url;
  this.name = name;
  this.event_date = date;
  this.summary = summary;
}

Event.prototype.save = function(location_id){
  const SQL = `INSERT INTO events (summary, name, event_date, created_at, location_id) VALUES($1, $2, $3, $4, $5)`;

  const VALUES = [this.name, this.summary, this.event_date, this.created_at, location_id];

  client.query(SQL, VALUES);
}

function handleError(error, response) {
  response.status(error.status || 500).send(error.message);
}

function deleteData(tableName, location_id){
  const SQL = `DELETE FROM ${tableName} WHERE location_id=$1;`;
  const VALUES = [location_id];
  return client.query(SQL, VALUES);
}

function lookupData(lookupHandler){
  const SQL = `SELECT * FROM ${lookupHandler.tableName} WHERE ${lookupHandler.column}=$1`
  const VALUES = [lookupHandler.query]

  client.query(SQL, VALUES).then(result => {
    if(result.rowCount === 0){
      lookupHandler.cacheMiss();
    } else {
      lookupHandler.cacheHit(result);
    }
  })
}


function getLocation(req, res){
  lookupData({
    tableName: 'locations',
    column: 'search_query',
    query: req.query.data,

    cacheHit: function (result) {
      console.log('from db')
      res.send(result.rows[0]);
    },

    cacheMiss: function(){
      console.log('from api');
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GEOCODE_API_KEY}`;

      superagent.get(url)
        .then(geoData => {
          const location = new Location(this.query, geoData.body);
          location.save().then(location => res.send(location));
        })
    }

  })
}

function getWeather(req, res){
 lookupData({
   tableName: 'weather',
   column: 'location_id',
   query: req.query.data.id,

   cacheHit: function(result){
    let ageOfResults = (Date.now() - result.rows[0].created_at);
    if(ageOfResults > timeouts.weather){
      deleteData('weather', req.query.data.id).then(() =>{
         this.cacheMiss();
      })
     
    } else {
      res.send(result.rows);
    }
   },

   cacheMiss: function(){
    const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${req.query.data.latitude},${req.query.data.longitude}`

    superagent.get(url)
      .then(weatherData => {
        const weatherSummaries = weatherData.body.daily.data.map(day => {
          const summary = new Weather(day);
          summary.save(req.query.data.id);
          return summary
        });
        res.send(weatherSummaries);
      })
   }
 })
}

function getEvents(req, res){
  lookupData({
    tableName: 'events',
    column: 'location_id',
    query: req.query.data.id,
 
    cacheHit: function(result){
     let ageOfResults = (Date.now() - result.rows[0].created_at);
     if(ageOfResults > timeouts.events){
       deleteData('events', req.query.data.id).then(() =>{
          this.cacheMiss();
       })
      
     } else {
       res.send(result.rows);
     }
    },
 
    cacheMiss: function(){
     const url = `https://www.eventbriteapi.com/v3/events/search/?token=${process.env.EVENTBRITE_API_KEY}&location.address=${req.query.data.search_query}&location.within=10km`
 
     superagent.get(url)
       .then(eventData => {
         const eventSummaries = eventData.body.events.map(event => {
           const summary = new Event(event);
           summary.save(req.query.data.id);
           return summary
         });
         res.send(eventSummaries);
       })
    }
  })
 }


function getYelps(req, res){

}

function getMovies(req, res){

}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`We know you came to party on ${PORT} Babay babya abbaya babayyay`);
});







// SCOTT CODE
// 'use strict';
// //basically script tags for backend
// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();
// const superagent = require('superagent');
// const pg = require('pg');

// const client = new pg.Client(process.env.DATABASE_URL);
// client.connect();

// const app = express();
// app.use(cors());

// // server routes
// app.get('/location', getLocation);
// app.get('/events', getEvents);
// app.get('/weather', getWeather);
// app.get('/yelp', getYelps);
// app.get('/movies',getMovies);

// const timeouts = {
//   weather: 15000,
//   yelp: 15000,
//   movies: 15000,
//   events: 15000
// };

// function convertTime(timeInMilliseconds) {
//   return new Date(timeInMilliseconds).toString().split(' ').slice(0, 4).join(' ');
// }

// //location constructor
// function Location(query, geoData) {
//   this.search_query = query;
//   this.formatted_query = geoData.results[0].formatted_address;
//   this.latitude = geoData.results[0].geometry.location.lat;
//   this.longitude = geoData.results[0].geometry.location.lng;
// }
// Location.prototype.save = function(){
//   const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`
//   const VALUES = [this.search_query, this.formatted_query, this.latitude, this.longitude];

//   return client.query(SQL,VALUES).then(result => {
//     this.id = results.rows[0].id;
//     return this;
//   })
// }

// function Weather(weatherData) {
//   this.created_at = Date.now();
//   this.forecast = weatherData.summary || weatherData.forecast;
//   this.time = isNaN(weatherData.time) ? weatherData.time : convertTime(weatherData.time * 1000);
// }

// Weather.prototype.save = function(location_id){
//   const SQL = `INSERT INTO weather (forecast, time, created_at,location_id) VALUES ($1,$2,$3,$4)`;

//   const VALUES = [this.forecast, this.time, this.created_at, location_id];

//   client.query(SQL,VALUES);
// }

// function Event(eventData) {
//   this.link = eventData.url || eventData.link;
//   this.name = eventData.name.text ? eventData.name.text : eventData.name;
//   this.event_date = eventData.start ? eventData.start.local : eventData.event_date;
//   this.summary = eventData.description ? eventData.description.text : eventData.summary;
// }

// function queryData(query, values, onNotExist, onExist, onError) {
//   client.query(query, values).then(results => {
//     if (results.rows.length === 0) {
//       onNotExist();
//     } else {
//       onExist(results);
//     }
//   }).catch((error) => onError(error));
// }


// function handleTerryFold(results, searchTerm, response) {
//   const location = new Location(searchTerm, results.rows[0].formatted_query, results.rows[0].latitude, results.rows[0].longitude);
//   response.send(location);
// }

// function handleNewLocationData(searchTerm, response) {
//   superagent.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${searchTerm}&key=${process.env.GEOCODE_API_KEY}`)
//     .then((locationData) => {
//       const location = new Location(searchTerm, locationData.body.results[0].formatted_address, locationData.body.results[0].geometry.location.lat, locationData.body.results[0].geometry.location.lng);
//       const query = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
//       const values = Object.values(location);
//       client.query(query, values).catch((...args) => console.log(args));
//       response.send(location);
//     })
//     .catch((error) => handleError(error, response));
// }


// app.get('/events', (request, response) => {
//   const query = 'SELECT * FROM events WHERE latitude=$1 AND longitude=$2;';
//   const values = [request.query.data.latitude, request.query.data.longitude];
//   queryData(query, values,
//     () => handleNewEventData(request.query.data.latitude, request.query.data.longitude, response),
//     (results) => handleOldEventData(results, response),
//     (error) => handleError(error, response)
//   );
// });



// app.get(/.*/, (req, res) => {
//   res.status(404).send({ status: 404, responseText: 'This item could not be found..' });
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log('I know that you came to party baby, baby, baby, baby');
// });

// function handleNewWeatherData(latitude, longitude, response) {
//   superagent
//     .get(`https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${latitude},${longitude}`)
// }

// function handleOldWeatherData(results, response) {
//   response.send(results.rows.map(day => {
//     return new Weather(day);
//   }));
// }

// function handleNewEventData(latitude, longitude, response) {
//   superagent
//     .get(`https://www.eventbriteapi.com/v3/events/search/?token=${process.env.EVENTBRITE_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}&location.within=10km`)
// }
// function deleteData(tableName, location_id) {
//   const SQL =`DELETE FROM ${tableName} WHERE location_id=${location_id}`;;
//   const VALUES = [location_id];
//   return client.query(SQL, VALUES);
//  }

// function lookupData(lookupHandler){
//     const SQL = `SELECT * FROM ${lookupHandler.tableName} WHERE ${lookupHandler.column}=$1`
//     const VALUES = [lookupHandler.query]

//     client.query(SQL, VALUES).then(result => {
//       if(result.rowCount === 0){
//         lookupHandler.cacheMiss();
//       } else {
//         lookupHandler.cacheHit(result);
//       }
//     })
//   }

// function getLocation(req,res){
//   lookupData({
//     tableName: 'locations',
//     column: 'search_query',
//     query: req.query.data, 

//     cacheHit: function (result){
//       res.send(result.rows[0]);
//     },

//     cacheMiss: function(){
//       const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GEOCODE_API_KEY}`

//       superagent.get(url)
//         .then(geoData => {
//           const location = new Location(this.query, geoData.body);
//           location.save().then(location => res.send(location));
//         })
//     }
//   })
// }

// function getWeather(req,res){
//   lookupData({
//     tableName: 'weather',
//     column: 'location_id',
//     query: req.query.data.id,

//     cacheHit: function(result){
//       let ageOfResults = (Date.now() - result.rows[0].created_at);
//       if(ageOfResults > timeouts.weather){
//         deleteData('weather',req.query.data.id).then(() =>{
//           this.cacheMiss();
//         })
//       } else {
//         res.send(result.rows);
//       }
//     },

//     cacheMiss: function(){
//       const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${req.query.data.latitude},${req.query.data.longitude}`

//       superagent.get(url)
//         .then(weatherData => {
//           const weatherSummaries = weatherData.body.daily.map(day => {
//             const summary = new Weather(day);
//             summary.save(req.query.data.id);
//             return summary;
//           });
//           res.send(weatherSummaries);
//         })
//     }
//   })
// }

// function getEvents(req,res){

// }

// function getYelps(req,res){

// }

// function getMovies(req,res){

// }

// function handleOldEventData(results, response) {
//   const events = results.rows.map(event => new Event(event));
//   response.send(events);
// }