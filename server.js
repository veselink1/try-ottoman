const express = require('express');
const ottoman = require('ottoman');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('./ottoman-global-config');
const { HotelRoutes } = require('./src/hotels/hotels.controller');
const { AirportRoutes } = require('./src/airports/airports.controller');
const { FlightRoutes } = require('./src/flights/flights.controller');

const app = express();

app.use(express.json());
app.get('/', (req, res) => {
  res.send('I am ready!!');
});
app.use('/hotels', HotelRoutes);
app.use('/airports', AirportRoutes);
app.use('/flightPaths', FlightRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(YAML.load('./swagger.yaml')));

app.use((err, req, res, next) => {
  return res.status(500).json({ error: err.toString() });
});

ottoman.start().then(() => {
  console.log('All the indexes were registered');
  const port = 4500;
  app.listen(port, () => {
    console.log(`API started at http://localhost:${port}`);
    console.log(`API docs at http://localhost:${port}/api-docs/`);
  });
}).catch(e => console.log(e));

