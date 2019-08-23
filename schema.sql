DROP TABLE IF EXISTS locations, weather, events, yelp, movies;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at BIGINT
);

CREATE TABLE weather (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR (255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10,7),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  created_at BIGINT
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  event_date VARCHAR(255),
  link VARCHAR(255),
  summary VARCHAR(8000),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10,7),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  created_at BIGINT
);

CREATE TABLE yelps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  image_url VARCHAR(255),
  price CHAR(5),
  rating NUMERIC(2,1),
  url VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations (id)
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  overview VARCHAR(1000),
  average_votes NUMERIC(4,2),
  total_votes INTEGER, 
  image_url VARCHAR(255),
  popularity NUMERIC(6,4),
  released_on CHAR(10),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);