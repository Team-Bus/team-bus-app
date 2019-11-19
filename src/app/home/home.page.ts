import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { DrawerState } from 'ion-bottom-drawer';
import mapboxgl from 'mapbox-gl';
import { BusapiService } from '../busapi.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  shouldBounce = true;
  disableDrag = false;
  dockedHeight = 250;
  distanceTop = 50;
  drawerState = DrawerState.Bottom;
  states = DrawerState;
  minimumHeight = 140;


  @ViewChild('map', { static: false }) map: ElementRef;

  constructor(public navCtrl: NavController, private busService: BusapiService) { }

  ionViewDidEnter() {

    this.busService.getBuses();

    console.log(this.busService.sortedBuses);

    // Token from Jacob's Mapbox Account
    mapboxgl.accessToken = environment.mapbox.accessToken;
    let map = new mapboxgl.Map({
      container: this.map.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v9',
      center: [-72.527004, 42.390492], // Center of Umass starting pos?
      zoom: 13
    });

    // ../assets/bus.png

    map.on('load', () => {

      this.busService.sortedBuses.forEach((bus) => {

        var el = document.createElement('div');
        el.className = 'marker';
        el.style.background = '#' + bus.Color;
        el.style.width = '10px';
        el.style.height = '10px';
  
        new mapboxgl.Marker(el, {offset: [0, 0]})
          .setLngLat([bus.Longitude,bus.Latitude])
          .addTo(map);
      });
    });
  }
}
