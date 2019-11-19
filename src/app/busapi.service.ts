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
    let buses = this.httpClient.get("http://team-bus-backend.herokuapp.com/api/vehicle/");
    buses.subscribe(data => {

      let vehicles = data["Vehicles"];

      for(let key in vehicles) {
        if(vehicles.hasOwnProperty(key)) {

          let bus = new Bus(vehicles[key]);

          this.sortedBuses.push(bus);
        }
      }
    });
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
