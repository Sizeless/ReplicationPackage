const airports =  require("./data/airports.json");
const flightsPerDay = 200;
const Combinatorics = require('js-combinatorics');
const fs = require('fs');
const faker = require('faker');
const moment = require('moment');
const timezones =  require("./data/timezones.json");
const JSON = require('JSON');

const validAirports = airports.filter(airport => (airport.code && airport.country && airport.city && airport.name));
console.log("Number of airports from file: ", airports.length);
console.log("Number of valid airports: ", validAirports.length);
  
  
const allFlightRoutes = Combinatorics.bigCombination(airports,2).toArray();
console.log("number of combinations: ", allFlightRoutes.length);

//Reduce flight routes based on config
const flightRoutes = allFlightRoutes.splice(0, flightsPerDay/2);
console.log("number of flights per day: ", flightsPerDay);

const allFlights = flightRoutes.map(route => generateFlights(route))
                         .reduce((arr, x) => arr.concat(x), []); //flatten array

flightalias = 0
fs.writeFileSync('flights.json', `
mutation flight1 {
`, function(){})
for(let flight of allFlights) {
    fs.appendFileSync('flights.json', 
    `f${flightalias}: createFlight(input:{
        departureDate: "${flight.departureDate.toISOString()}",
        departureAirportCode: "${flight.departureAirportCode}",
        departureAirportName: "${flight.departureAirportName}",
        departureCity: "${flight.departureCity}",
        departureLocale: "${flight.departureLocale}",
        arrivalDate: "${flight.arrivalDate.toISOString()}",
        arrivalAirportCode: "${flight.arrivalAirportCode}",
        arrivalAirportName: "${flight.arrivalAirportName}",
        arrivalCity: "${flight.arrivalCity}",
        arrivalLocale: "${flight.arrivalLocale}",
        ticketPrice: ${flight.ticketPrice},
        ticketCurrency: "EUR",
        flightNumber: ${flight.flightNumber},
        seatAllocation: ${flight.seatAllocation},
        seatCapacity: ${flight.seatCapacity}
    }) {
        id
    }
	
`, function(){})
	++flightalias
}
fs.appendFileSync('flights.json', `}`, function(){})


function generateFlights(route){
  const airport1 = route[0];
  const airport2 = route[1];

  // Create for May 2020
  const next30Days = [...Array(1)].map((x, i) => {
    const start = moment(1578243600000).utc().add(i+1, 'days').startOf('day').toDate();
    const end = moment(1578243600000).utc().add(i+1, 'days').endOf('day').toDate();

    const outboundFlight = createFlight(airport1, airport2, start, end);
    const inboundFlight = createFlight(airport2, airport1, start, end);

    return [outboundFlight, inboundFlight];
  }).reduce((arr, x) => arr.concat(x), []); //flatten array

  return next30Days;
}

function createFlight(departureAirport, arrivalAirport, start, end){
  const flightDeparture = getRandomDate(start, end);
  const flightArrival = getRandomDate(flightDeparture, end);
  const availableSeats = (Math.floor(Math.random() * Math.floor(50)) + 1000) * 1000;
  const flight = {
    id: faker.random.uuid(),
    "arrivalAirportCode#departureDate": arrivalAirport.code+"#"+flightDeparture.toISOString(),
    departureDate: flightDeparture,
    departureAirportCode: departureAirport.code,
    departureAirportName: departureAirport.name,
    departureCity: departureAirport.city,
    departureLocale: timezones[departureAirport.code].timezone,
    arrivalDate: flightArrival,
    arrivalAirportCode: arrivalAirport.code,
    arrivalAirportName: arrivalAirport.name,
    arrivalCity: arrivalAirport.city,
    arrivalLocale: timezones[arrivalAirport.code].timezone,
    ticketPrice: parseInt(faker.finance.amount()) + 1,
    ticketCurrency: faker.finance.currencyCode(),
    flightNumber: faker.random.number(),
    seatAllocation: availableSeats,
    seatCapacity: availableSeats,
    ttl: Math.floor(flightArrival / 1000) //Delete flight after arrival
  };
  return flight;
}

function getRandomDate(start, end){
  start = start.getTime(), end = end.getTime();
  return new Date(start + Math.random() * (end - start));
}