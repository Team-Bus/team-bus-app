import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import mapboxgl from 'mapbox-gl';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BusapiService {

  sortedBuses = [];
  sortedStops = [];
  arrivalBuses = [];

  constructor(private httpClient: HttpClient) { }

  getBuses() {

    return new Promise(resolve => {
      let buses = this.httpClient.get("https://team-bus-backend.herokuapp.com/api/vehicle/");
      buses.subscribe(data => {

        let vehicles = data["Vehicles"];

        for (let key in vehicles) {
          if (vehicles.hasOwnProperty(key)) {

            let bus = new Bus(vehicles[key]);

            this.sortedBuses.push(bus);
          }
        }

        resolve(this.sortedBuses);
      });
    });
  }

  getStops() {

    return new Promise(resolve => {
      let stops = this.httpClient.get("https://team-bus-backend.herokuapp.com/api/stop/");
      stops.subscribe(data => {

        let stops = data["Stops"];

        for (let key in stops) {
          if (stops.hasOwnProperty(key)) {

            let stop = new Stop(stops[key]);

            let a = 42.389439 - stop.Latitude;
            let b = -72.528372 - stop.Longitude;
            let distance = Math.sqrt(a * a + b * b);

            if (distance < 0.12) {
              this.sortedStops.push(stop);
            }
          }
        }

        resolve(this.sortedStops);
      });
    });
  }

  getStopsForBus(bus) {
    return new Promise(resolve => {

      let routeStops = [];

      let stopsRequest = this.httpClient.get('https://team-bus-backend.herokuapp.com/api/route/' + bus.RouteId);
      stopsRequest.subscribe(data => {

        let stops = data["Route"]["Stops"];

        stops.forEach(stop => {

          let routeStop = new Stop(stop);

          if(routeStop.Latitude == null || routeStop.Longitude == null){
            // Invalid Stop
          } else {
            routeStops.push(routeStop);
          }
        });
        //routeStops.sort((a, b) => a.StopId - b.StopId);

        resolve(routeStops);
      })
    })
  }

  getMatch(coordinates, radius, profile) {
    let radiuses  = radius.join(';');

    return new Promise(resolve => {

      let matchRequest = this.httpClient.get('https://api.mapbox.com/matching/v5/mapbox/' + profile + '/' + coordinates + '?geometries=geojson&radiuses=' + radiuses + '&steps=true&access_token=' + mapboxgl.accessToken)
      matchRequest.subscribe(data => {
        let coords = data["matchings"][0]["geometry"];

        console.log(coords);
        resolve(coords);
      })
    });
  }

  getNextBusesForStop(stopID) {
    return new Promise(resolve => {
      let departureRequest = this.httpClient.get('https://team-bus-backend.herokuapp.com/api/stop/departures/' + stopID);
      departureRequest.subscribe(data => {
        this.arrivalBuses = [];

        let directions = data['RouteDirections'];

        directions.forEach(direction => {

          let departures = direction['Departures'];

          departures.forEach(depart => {

            let tripid = depart['Trip']['BlockFareboxId'];

            let matchingBus = null;

            this.sortedBuses.forEach(bus => {

              if (bus.BlockFareboxId == tripid) {

                matchingBus = bus;
              }
            });

            let etaDate = new Date(depart['ETALocalTime']);
            let staDate = new Date(depart['STALocalTime']);

            let eta = (etaDate.getHours() <= 12 ? etaDate.getHours() : etaDate.getHours() - 12) + ":" + ("0" + etaDate.getMinutes()).slice(-2) + (etaDate.getHours() < 12 ? " AM" : " PM");
            let sta = (staDate.getHours() <= 12 ? staDate.getHours() : staDate.getHours() - 12) + ":" + ("0" + staDate.getMinutes()).slice(-2) + (staDate.getHours() < 12 ? " AM" : " PM");

            let departure = new Departure(matchingBus, eta, sta, depart['Dev'], staDate);

            if (departure.Bus != null) {
              this.arrivalBuses.push(departure);
            }
          });
        });

        this.arrivalBuses.sort((a, b) => a.OriginalSTA - b.OriginalSTA);

        resolve(this.arrivalBuses);
      });
    });
  }

  getClosestStop(lat: number, long: number) {

    mapboxgl.accessToken = environment.mapbox.accessToken;

    return new Promise(resolve => {

      let stopRequest = this.httpClient.get('https://team-bus-backend.herokuapp.com/api/stop/nearest?lat=' + lat + '&long=' + long);
      stopRequest.subscribe(data => {
        let closestStop = new Stop(data);
        resolve(closestStop);
      });
    });
  }

}

export class Departure {
  Bus: Bus
  ETA: string
  STA: string
  Dev: string
  OriginalSTA: Date

  constructor(bus: Bus, eta: string, sta: string, dev: string, orgSTA: Date) {
    this.Bus = bus;
    this.ETA = eta;
    this.STA = sta;
    this.Dev = dev;
    this.OriginalSTA = orgSTA;
  }
}


export class Bus {
  VehicleId: number
  Latitude: number
  Longitude: number
  Destination: string
  Heading: number
  LastStop: string
  OnBoard: number
  DisplayStatus: string
  Color: string
  RouteShortName: string
  Deviation: string
  BlockFareboxId: number
  RouteId: number

  constructor(values: Object = {}) {
    Object.assign(this, values);
  }
}

export class Stop {
  StopId: number
  StopRecordID: number
  Name: string
  Description: string
  Latitude: number
  Longitude: number
  IsTimePoint: boolean

  constructor(values: Object = {}) {
    Object.assign(this, values);
  }
}
