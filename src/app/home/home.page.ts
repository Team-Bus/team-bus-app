import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { DrawerState } from 'ion-bottom-drawer';
import mapboxgl from 'mapbox-gl';

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
  minimumHeight = 170;


  @ViewChild('map', { static: false }) map: ElementRef;

  constructor(public navCtrl: NavController) { }

  ionViewDidEnter() {

    // Token from Jacob's Mapbox Account
    mapboxgl.accessToken = environment.mapbox.accessToken;
    let map = new mapboxgl.Map({
      container: this.map.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v9',
      center: [-72.527004, 42.390492], // Center of Umass starting pos?
      zoom: 13
    });

    map.on('load', () => {
      map.loadImage("../assets/bus.png", function (error, image) {
        if (error) throw error;
        map.addImage("custom-marker", image);
        /* Style layer: A style layer ties together the source and image and specifies how they are displayed on the map. */
        map.addLayer({
          id: "markers",
          type: "symbol",
          /* Source: A data source specifies the geographic coordinate where the image marker gets placed. */
          source: {
            type: "geojson",
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: "Point",
                    coordinates: [-72.533051, 42.393484]
                  }
                }
              ]
            }
          },
          layout: {
            "icon-image": "custom-marker",
            "icon-size": 0.05
          }
        });
      });
    });
  }
}
