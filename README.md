# Building Your First App

## Prepare Couchbase Server

This is a sample application for getting started with OttomanJS using Couchbase Server 6.5. The application provides a Rest API and demonstrates ODM capabilities. It uses Couchbase Server 6.5. together with OttomanJS v2 + Express + Couchbase SDK + Node.js.  The application is a flight planner that allows the user to search for and select a flight route (including return flight) based on airports and dates.

## Prepare Our Project Folder

Install Node.js from the [Node.js website](http://nodejs.org/).  Once Node.js is installed, we can bootstrap our application. Create a directory and clone the repository on GitHub.

#### Development Guide

1. [Install Couchbase Server Using Docker](https://docs.couchbase.com/server/current/install/getting-started-docker.html).

2. Get repo and install dependencies 
```
$ git clone https://github.com/couchbaselabs/try-ottoman.git
$ cd try-ottoman
$ yarn install
```

3. Now we are ready to run API example.
```
$ yarn start
```

## Tutorial Project (Travel-Sample) Goals

The requirements of this application are:

- REST Api for Travel-Sample Application.
- The application must store hotels, flight and airports information.
- Couchbase will be the system of record.

### Data Model

The flexiblity and dynamic nature of a NOSQL Document Database and JSON simplifies building the data model. For the travel sample application we will use three types of objects, and we'll define those in specific modules in the node application.   

- airports
- flightPaths
- hotels
 
The source code is organized by each module in a folder under the root of the application, a module defines REST endpoints, and the data model of a resource. The data model is defined in `.model.js` by the schema and model, and case of endpoints are defined in `.controller.js`. Let's walk through the code starting with the `hotels` module.

### Hotel Model

The first section of the hotel module instantiates module dependencies, which are Ottoman and the database file where the information on the Couchbase instance is stored for this particular example. 

```javascript
const { model, addValidators, Schema } = require('ottoman');    // ← use ottoman
const { GeolocationSchema } = require('../shared/geolocation.schema');
```

Next, a custom validator function is defined to make sure that a phone number in the standard USA format is created.

```ts
addValidators({
  phone: function(value) {
      const phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
      if(value && !value.match(phone)) {
        throw new Error('Phone number is invalid.');
      }
  },
});
```

The model for the Hotels object is defined, using several of the built in types that Ottoman supports. For additional reference, see http://www.ottomanjs.com. Several indices are defined along with the model. The indices are utilized as methods for each instance of the Hotel Object. Ottoman supports complex data types, embedded references to other models, and customization.


We are going to define a custom type link
```javascript
    const { IOttomanType, ValidationError, registerType } = require('ottoman');
    
    /**
     * Custom type to manage the links
     */
    class LinkType extends IOttomanType {
      constructor(name: string) {
        super(name, 'Link');
      }
      cast(value: unknown) {
        if (!isLink(String(value))) {
          throw new ValidationError(`Field ${this.name} only allows a Link`);
        }
        return String(value);
      }
    }
    
    /**
     * Factory function
     * @param name of field
     */
    const linkTypeFactory = (name) => new LinkType(name);
    
    /**
     * Register type on Schema Supported Types
     */
    registerType(LinkType.name, linkTypeFactory);
    
    /**
     * Check if value is a valid Link
     * @param value
     */
    function isLink(value: string) {
      const regExp = new RegExp(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
      );
      return regExp.test(value);
    };

    module.exports = {
      LinkType
    }
```

With the link custom type, we continue with the schema definition

```javascript
const ReviewSchema = new Schema({
  author: String,
  content: String,
  date: Date,
  ratings: {
    Cleanliness: { type: Number, min: 1, max: 5 },
    Overall: { type: Number, min: 1, max: 5 },
    Rooms: { type: Number, min: 1, max: 5 },
    Service: { type: Number, min: 1, max: 5 },
    Value: { type: Number, min: 1, max: 5 },
  },
});

const HotelSchema = new Schema({
  address: { type: String, required: true },
  alias: String,
  checkin: String,
  checkout: String,
  city: { type: String, required: true },
  country: { type: String, required: true },
  description: String,
  directions: [String],
  email: String,
  fax: String,
  free_breakfast: Boolean,
  free_internet: Boolean,
  free_parking: Boolean,
  geo: GeolocationSchema,
  name: { type: String, required: true },
  pets_ok: Boolean,
  phone: { type: String, validator: 'phone' }, // My custom validator
  price: Number,
  public_likes: [String],
  reviews: [ReviewSchema],
  state: String,
  title: String,
  tollfree: String,
  url: LinkType, // My custom type
  vacancy: Boolean,
});

HotelSchema.index.findByName = { by: 'name', type: 'n1ql' };

const HotelModel = model('hotel', HotelSchema);
module.exports = {
  HotelModel
}
```

In the Hotel model above, there is one explicit index defined. By default,
if an index type is not specified Ottoman will select the fastest available index supported within the current Couchbase cluster.
In addition to utilizing built in secondary index support within Couchbase, 
Ottoman can also utilize referential documents and maintain the referential integrity for updates and deletes. 
This is a powerful features that allows for blazingly fast lookups by a particular field. 
This type of index in Ottoman is useful for finding a particular object by a unique field such as customer id or email address in the example above.
In addition to any explicit index, Ottoman also provides a generic find capability using the query api and N1QL. 

### Airport Model

The airport module begins much the same way as the hotel module.  

```javascript
const { model, addValidators, Schema } = require('ottoman');    // ← use ottoman
const { GeolocationSchema } = require('../shared/geolocation.schema');
```

As in the Hotel model example, the Airport object is defined with several different data types, embedded references to other Ottoman models and explicitly defined secondary indexes. 

```javascript
const AirportSchema = new Schema({
 airportname: { type: String, required: true },
 city: { type: String, required: true },
 country: { type: String, required: true },
 faa: String,
 geo: GeolocationSchema,
 icao: String,
 tz: { type: String, required: true },
});

AirportSchema.index.findByName = { by: 'name', type: 'n1ql' };

const AirportModel = model('airport', AirportSchema);
module.exports = {
  AirportModel
}
```

The index like in the hotel example are. 

### Application and Routing

Now that the models are defined above, the controller functionality is defined in the ```server.js``` file in the root directory and the routes on files ```*.controller.js``` in the module directory. 

#### App

The `index.js` file is the entry point to the application and defines how the application will function. The code within the file is as follows:

```javascript
const express = require('express');
const ottoman = require('ottoman');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { HotelRoutes } = require('./src/hotels/hotels.controller');
const { AirportRoutes } = require('./src/airports/airports.controller');
const { FlightRoutes } = require('./src/flights/flights.controller');

const app = express();

app.use(express.json());
app.get('/', (req, res) => {
  res.send('index');
});
app.use('/airports', jwtMiddleware, AirportRoutes);
app.use('/hotels', jwtMiddleware, HotelRoutes);
app.use('/flightPaths', jwtMiddleware, RouteRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(YAML.load('./api/swagger.yaml')));

// Handle not found and catch exception layer
app.use((err, req, res, next) => {
  return res.status(500).json({ error: err.toString() });
});

ottoman.ensureIndexes()
  .then(() => {
    console.log('All the indexes were registered');
    const port = 4500;
    app.listen(port, () => {
      console.log(`API started at http://localhost:${port}`);
    });
  })
  .catch((e) => console.log(e));
// ← API started at http://localhost:4500
```

#### Routes and Documentations
Once you have the example running, you can find all definitions in Swagger:

```http://127.0.0.1:4500/api-docs```
