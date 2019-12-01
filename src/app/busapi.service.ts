import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BusapiService {

  sortedBuses = [];

  constructor(private httpClient: HttpClient) { }

  getBuses() {

    return new Promise(resolve => {
      let buses = this.httpClient.get("https://team-bus-backend.herokuapp.com/api/vehicle/");
      buses.subscribe(data => {

        let vehicles = data["Vehicles"];

        for(let key in vehicles) {
          if(vehicles.hasOwnProperty(key)) {

            let bus = new Bus(vehicles[key]);

            this.sortedBuses.push(bus);
          }
        }

        resolve(this.sortedBuses);
      });
    });
  }

  getClosestBus(currentLocation) {
    let curLat = currentLocation.latitude;
    let curLong = currentLocation.longitude;

    let closestBusIndex = 0;
    let shortestDistance = 999999999999999999999999;
    let index = 0;
    this.sortedBuses.forEach(bus => {
      let a = curLat - bus.Latitude;
      let b = curLong - bus.Longitude;
      let distance = Math.sqrt(a*a + b*b);
      
      if(shortestDistance > distance) {
        closestBusIndex = index;
      }
      index++;
    });
    return this.sortedBuses[closestBusIndex];
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

  constructor(values: Object = {}) {
    Object.assign(this, values);
  }
}
