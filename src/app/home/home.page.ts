import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { DrawerState } from 'ion-bottom-drawer';
import mapboxgl from 'mapbox-gl';
import { BusapiService } from '../busapi.service';
import { Geolocation } from '@ionic-native/geolocation/ngx';

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

  selectedTitle = 'Default Title'
  selectedSubTitle = 'Default Subtitle'
  selectedPassengerCount = 27;


  @ViewChild('map', { static: false }) map: ElementRef;

  constructor(public navCtrl: NavController, private busService: BusapiService, private geolocation: Geolocation) { }

  ionViewDidEnter() {

    this.busService.getBuses().then((buses) => {
      // Token from Jacob's Mapbox Account
      mapboxgl.accessToken = environment.mapbox.accessToken;
      let map = new mapboxgl.Map({
        container: this.map.nativeElement,
        style: 'mapbox://styles/mapbox/streets-v9',
        center: [-72.527004, 42.390492], // Center of Umass starting pos?
        zoom: 13
      });


      map.on('drag', () => {
        this.drawerState = DrawerState.Bottom;
      });


      map.on('load', () => {

        this.geolocation.getCurrentPosition(
          {
            maximumAge: 1000, timeout: 5000,
            enableHighAccuracy: true
          }
        ).then((resp) => {
          map.flyTo({
            center: [resp.coords.longitude, resp.coords.latitude],
            offset: [0, -75],
            zoom: 15,
            speed: 2,
            curve: 1,
            easing(t) {
              return t;
            }
          });
          let closest = this.busService.getClosestBus(resp.coords);
          this.selectedTitle = closest.RouteShortName;
          this.selectedSubTitle = closest.Destination;
          this.selectedPassengerCount = closest.OnBoard;

          let markerContainer = document.createElement('div');
          markerContainer.className = 'image-container';

          let markerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          markerSvg.setAttributeNS(null, 'viewBox', '0 0 100 100');
          markerSvg.setAttributeNS(null, 'height', '100px');
          markerSvg.setAttributeNS(null, 'width', '100px');
          markerSvg.setAttributeNS(null, 'style', 'z-index: -100;');

          let locationCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          locationCircle.setAttributeNS(null, 'cx', '50px');
          locationCircle.setAttributeNS(null, 'cy', '50px');
          locationCircle.setAttributeNS(null, 'r', '7px');
          locationCircle.setAttributeNS(null, 'style', 'fill: DodgerBlue ; stroke: white; stroke-width: 2.5px;');


          markerSvg.appendChild(locationCircle);
          markerContainer.appendChild(markerSvg);

          new mapboxgl.Marker(markerContainer, { offset: [0, 0] })
            .setLngLat([resp.coords.longitude, resp.coords.latitude])
            .addTo(map);


        }, er => {
          console.log('Can not retrieve Location' + er)
        }).catch((error) => {
          console.log('Error getting location - ' + error)
        });

        this.busService.sortedBuses.forEach((bus) => {

          let markerContainer = document.createElement('div');
          markerContainer.className = 'image-container';

          let markerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          markerSvg.setAttributeNS(null, 'viewBox', '0 0 512 512');
          markerSvg.setAttributeNS(null, 'height', '37.5px');
          markerSvg.setAttributeNS(null, 'width', '75px');
          markerSvg.setAttributeNS(null, 'style', 'z-index: -100;');

          let busPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          busPath.setAttributeNS(null, 'id', 'bus');
          busPath.setAttributeNS(null, 'd', 'M480 358.856V153.143C480 130.512 461.674 112 439.272 112H72.728C50.326 112 32 130.512 32 153.143v205.713C32 381.488 50.326 400 72.728 400h366.545C461.674 400 480 381.488 480 358.856zM112 364V148h288v216H112z');
          busPath.setAttributeNS(null, 'fill', '#' + bus.Color);

          markerSvg.appendChild(busPath);
          markerContainer.appendChild(markerSvg);

          let marker = new mapboxgl.Marker(markerContainer, { offset: [0, 0] })
            .setLngLat([bus.Longitude, bus.Latitude])
            .addTo(map);

          marker.getElement().addEventListener('click', () => {
            this.goToBus(map, bus);
          });
        });
      });
    });
  }

  goToBus(map, bus) {
    this.selectedTitle = bus.RouteShortName;
    this.selectedSubTitle = bus.Destination;
    this.selectedPassengerCount = bus.OnBoard;


    map.flyTo({
      center: [bus.Longitude, bus.Latitude],
      offset: [0, -75],
      zoom: 15,
      speed: 2,
      curve: 1,
      easing(t) {
        return t;
      }
    });
    this.drawerState = DrawerState.Docked;
  }

}
