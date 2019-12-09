import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, ModalController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { DrawerState } from 'ion-bottom-drawer';
import mapboxgl from 'mapbox-gl';
import { BusapiService, Departure, Stop } from '../busapi.service';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import StringSimilarity from 'string-similarity';
import { InformationPage } from '../information/information.page';


const stringSimilarity = StringSimilarity;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  shouldBounce = true;
  disableDrag = false;
  dockedHeight = 250;
  distanceTop = 70;
  drawerState = DrawerState.Bottom;
  states = DrawerState;
  minimumHeight = 150;

  selectedTitle = 'Default Title'
  selectedSubTitle = 'Default Subtitle'
  selectedPassengerCount = 1337;
  selectedStatus = 'Late';
  needInfo = true;

  showNormal = true;

  mapRef = null;

  matchingBuses = [];
  matchingStops = [];

  arrivalBuses = [];

  stopsForRoute = [];

  userLocation = null;

  colorBusMarkers = [];
  heatBusMarkers = [];

  gradient = ["#2bd500", "#55aa00", "#7f8000", "#aa5500", "#d52b00"];

  enableDashScroll() {
    this.disableDrag = false;
  }
  disableDashScroll() {
    this.disableDrag = true;
  }


  @ViewChild('map', { static: false }) map: ElementRef;

  constructor(public navCtrl: NavController, private busService: BusapiService, private geolocation: Geolocation, public modalController: ModalController) { }

  async openModal() {
    const modal = await this.modalController.create({
      component: InformationPage
    });
    return await modal.present();
  }


  runSearch(ev: any) {
    let searchValue = ev.target.value;
    if (searchValue.length > 1) {
      this.needInfo = false;
      this.drawerState = DrawerState.Top;
      this.searchBusesForTerm(searchValue);
      this.searchStopsForTerm(searchValue);
    } else {
      this.needInfo = true;
      this.drawerState = DrawerState.Bottom;
    }
  }

  openSearch(ev: any) {
    let searchValue = ev.target.value;
    if (searchValue.length > 1) {
      this.needInfo = false;
      this.drawerState = DrawerState.Top;
      this.searchBusesForTerm(searchValue);
      this.searchStopsForTerm(searchValue);
    }
  }

  fixMap() {
    this.mapRef.resize();
  }

  clearSearch() {
    this.matchingBuses = [];
    this.matchingStops = [];
    this.cancelSearch();
  }

  cancelSearch() {
    this.needInfo = true;
    this.drawerState = DrawerState.Bottom;
    this.matchingBuses = [];
    this.matchingStops = [];
  }


  searchBusesForTerm(term) {
    this.matchingBuses = [];
    this.busService.sortedBuses.forEach(bus => {
      try {
        let nameSim = stringSimilarity.compareTwoStrings(term, bus.RouteShortName);
        let destSim = stringSimilarity.compareTwoStrings(term, bus.Destination);

        if (nameSim > 0.1 || destSim > 0.1) {
          this.matchingBuses.push(bus);
        }
      } catch {

      }
    });
  }

  searchStopsForTerm(term) {
    this.matchingStops = [];
    this.busService.sortedStops.forEach(stop => {
      let nameSim = stringSimilarity.compareTwoStrings(term, stop.Name);
      let destSim = stringSimilarity.compareTwoStrings(term, stop.Description);

      if (nameSim > 0.2 || destSim > 0.2) {
        this.matchingStops.push(stop);
      }
    });
  }

  toggleMarkers() {
    this.showNormal = !this.showNormal;

    if (!this.showNormal) {
      this.colorBusMarkers.forEach(marker => {
        marker.remove();
      });
      this.heatBusMarkers.forEach(marker => {
        marker.addTo(this.mapRef);
      });
    } else {
      this.colorBusMarkers.forEach(marker => {
        marker.addTo(this.mapRef);
      });
      this.heatBusMarkers.forEach(marker => {
        marker.remove();
      });
    }
  }

  goToUserLocation() {

    if (this.userLocation != null) {

      this.mapRef.flyTo({
        center: [this.userLocation.longitude, this.userLocation.latitude],
        offset: [0, -75],
        zoom: 15,
        speed: 2,
        curve: 1,
        easing(t) {
          return t;
        }
      });
    }
  }

  ionViewDidEnter() {

    this.busService.getBuses().then((buses) => {

      this.busService.getStops().then((stops) => {
        // Token from Jacob's Mapbox Account
        mapboxgl.accessToken = environment.mapbox.accessToken;
        let map = new mapboxgl.Map({
          container: this.map.nativeElement,
          style: 'mapbox://styles/mapbox/streets-v9',
          center: [-72.527004, 42.390492], // Center of Umass starting pos?
          zoom: 13
        });

        this.mapRef = map;

        map.on('drag', () => {
          this.drawerState = DrawerState.Bottom;
          this.mapRef.resize();
        });


        map.on('load', () => {

          this.geolocation.getCurrentPosition(
            {
              maximumAge: 1000, timeout: 5000,
              enableHighAccuracy: true
            }
          ).then((resp) => {

            this.userLocation = resp.coords;

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
            this.busService.getClosestStop(resp.coords.latitude, resp.coords.longitude).then((stop) => {
              this.goToStop(map, stop);
            });

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

          this.busService.sortedStops.forEach(stop => {
            let markerContainer = document.createElement('div');
            markerContainer.className = 'image-container';

            let markerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            markerSvg.setAttributeNS(null, 'viewBox', '0 0 100 100');
            markerSvg.setAttributeNS(null, 'height', '100px');
            markerSvg.setAttributeNS(null, 'width', '100px');
            markerSvg.setAttributeNS(null, 'style', 'z-index: -100;');

            let stopCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            stopCircle.setAttributeNS(null, 'cx', '50px');
            stopCircle.setAttributeNS(null, 'cy', '50px');
            stopCircle.setAttributeNS(null, 'r', '7px');
            stopCircle.setAttributeNS(null, 'style', 'fill: red; stroke: white; stroke-width: 2px;');

            let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttributeNS(null, 'id', 'busNum');
            text.setAttributeNS(null, 'x', '50%');
            text.setAttributeNS(null, 'y', '51%');
            text.setAttributeNS(null, 'dominant-baseline', 'middle');
            text.setAttributeNS(null, 'text-anchor', 'middle');
            text.setAttributeNS(null, 'fill', '#FFF');
            text.setAttributeNS(null, 'font-size', '10');
            text.setAttributeNS(null, 'font-weight', '700');
            text.setAttributeNS(null, 'font-family', '"Source Sans Pro", sans-serif');
            text.textContent = 'S';

            markerSvg.appendChild(stopCircle);
            markerSvg.appendChild(text);
            markerContainer.appendChild(markerSvg);

            let popup = new mapboxgl.Popup({ offset: 10 })
              .setText(stop.Name);

            let marker = new mapboxgl.Marker(markerContainer, { offset: [0, 0], cluster: true })
              .setLngLat([stop.Longitude, stop.Latitude])
              .setPopup(popup)
              .addTo(map);

            marker.getElement().addEventListener('click', () => {
              this.goToStop(map, stop);
            });
          });

          this.busService.sortedBuses.forEach((bus) => {

            let markerContainer = document.createElement('div');
            markerContainer.className = 'svg-container';
            markerContainer.id = 'svgPlace';

            let markerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            markerSvg.setAttributeNS(null, 'id', 'bus');
            markerSvg.setAttributeNS(null, 'viewBox', '0 0 512 512');
            markerSvg.setAttributeNS(null, 'height', '37.5px');
            markerSvg.setAttributeNS(null, 'width', '75px');
            markerSvg.setAttributeNS(null, 'style', 'z-index: -100;');

            let busHolder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            busHolder.setAttributeNS(null, 'id', 'busHolder');
            busHolder.style.webkitTransformStyle = 'fill-box';
            busHolder.style.webkitTransformOrigin = 'center';

            let busPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            busPath.setAttributeNS(null, 'id', 'busProps');
            busPath.setAttributeNS(null, 'd', 'm480,358.85599l0,-205.71298c0,-22.63101 -18.32599,-41.14301 -40.728,-41.14301l-366.54401,0c-22.402,0 -40.728,18.51199 -40.728,41.14301l0,205.71298c0,22.63202 18.326,41.14401 40.728,41.14401l366.54501,0c22.401,0 40.72699,-18.51199 40.72699,-41.14401zm-368,5.14401l0,-216l288,0l0,216l-288,0z');
            busPath.setAttributeNS(null, 'fill', '#' + bus.Color);

            let busLight1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            busLight1.setAttributeNS(null, 'id', 'light1');
            busLight1.setAttributeNS(null, 'ry', '24.5');
            busLight1.setAttributeNS(null, 'rx', '19.5');
            busLight1.setAttributeNS(null, 'cy', '189.5');
            busLight1.setAttributeNS(null, 'cx', '58.5');
            busLight1.setAttributeNS(null, 'fill', '#fff');

            let busLight2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            busLight2.setAttributeNS(null, 'id', 'light2');
            busLight2.setAttributeNS(null, 'ry', '24.5');
            busLight2.setAttributeNS(null, 'rx', '19.5');
            busLight2.setAttributeNS(null, 'cy', '306.5');
            busLight2.setAttributeNS(null, 'cx', '60.5');
            busLight2.setAttributeNS(null, 'fill', '#fff');

            busHolder.appendChild(busPath);
            busHolder.appendChild(busLight1);
            busHolder.appendChild(busLight2);

            // busHolder.setAttributeNS(null, 'transform', 'rotate(' + (bus.Heading + 90) + ')');
            busHolder.style.webkitTransform = 'rotate(' + (bus.Heading + 90) + 'deg)';
            // busHolder.setAttributeNS(null, 'style', 'transform-origin: center; transform-origin: center;');

            let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttributeNS(null, 'id', 'busNum');
            text.setAttributeNS(null, 'x', '50%');
            text.setAttributeNS(null, 'y', '51%');
            text.setAttributeNS(null, 'dominant-baseline', 'middle');
            text.setAttributeNS(null, 'text-anchor', 'middle');
            text.setAttributeNS(null, 'fill', '#' + bus.Color);
            text.setAttributeNS(null, 'font-size', '150');
            text.setAttributeNS(null, 'font-weight', '700');
            text.setAttributeNS(null, 'font-family', '"Source Sans Pro", sans-serif');
            text.textContent = bus.RouteShortName;

            markerSvg.appendChild(busHolder);
            markerSvg.appendChild(text);
            markerContainer.appendChild(markerSvg);

            let popup = new mapboxgl.Popup({ offset: 10 })
              .setText(bus.RouteShortName);

            let marker = new mapboxgl.Marker(markerContainer, { offset: [0, 0] })
              .setLngLat([bus.Longitude, bus.Latitude])
              .setPopup(popup)
              .addTo(map);

            this.colorBusMarkers.push(marker);

            marker.getElement().addEventListener('click', () => {
              this.goToBus(map, bus);
            });


            // Heat Map Bus

            let gradientColor = this.gradient[Math.floor((bus.OnBoard / 60) * 5)];

            let markerContainer2 = document.createElement('div');
            markerContainer2.className = 'svg-container';
            markerContainer2.id = 'svgPlace';

            let markerSvg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            markerSvg2.setAttributeNS(null, 'id', 'bus');
            markerSvg2.setAttributeNS(null, 'viewBox', '0 0 512 512');
            markerSvg2.setAttributeNS(null, 'height', '37.5px');
            markerSvg2.setAttributeNS(null, 'width', '75px');
            markerSvg2.setAttributeNS(null, 'style', 'z-index: -100;');

            let busHolder2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            busHolder2.setAttributeNS(null, 'id', 'busHolder');
            busHolder2.style.webkitTransformStyle = 'fill-box';
            busHolder2.style.webkitTransformOrigin = 'center';

            let busPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            busPath2.setAttributeNS(null, 'id', 'busProps');
            busPath2.setAttributeNS(null, 'd', 'm480,358.85599l0,-205.71298c0,-22.63101 -18.32599,-41.14301 -40.728,-41.14301l-366.54401,0c-22.402,0 -40.728,18.51199 -40.728,41.14301l0,205.71298c0,22.63202 18.326,41.14401 40.728,41.14401l366.54501,0c22.401,0 40.72699,-18.51199 40.72699,-41.14401zm-368,5.14401l0,-216l288,0l0,216l-288,0z');
            busPath2.setAttributeNS(null, 'fill', gradientColor); // Change

            let busLight12 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            busLight12.setAttributeNS(null, 'id', 'light1');
            busLight12.setAttributeNS(null, 'ry', '24.5');
            busLight12.setAttributeNS(null, 'rx', '19.5');
            busLight12.setAttributeNS(null, 'cy', '189.5');
            busLight12.setAttributeNS(null, 'cx', '58.5');
            busLight12.setAttributeNS(null, 'fill', '#fff');

            let busLight22 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            busLight22.setAttributeNS(null, 'id', 'light2');
            busLight22.setAttributeNS(null, 'ry', '24.5');
            busLight22.setAttributeNS(null, 'rx', '19.5');
            busLight22.setAttributeNS(null, 'cy', '306.5');
            busLight22.setAttributeNS(null, 'cx', '60.5');
            busLight22.setAttributeNS(null, 'fill', '#fff');

            busHolder2.appendChild(busPath2);
            busHolder2.appendChild(busLight12);
            busHolder2.appendChild(busLight22);

            // busHolder.setAttributeNS(null, 'transform', 'rotate(' + (bus.Heading + 90) + ')');
            busHolder2.style.webkitTransform = 'rotate(' + (bus.Heading + 90) + 'deg)';
            // busHolder.setAttributeNS(null, 'style', 'transform-origin: center; transform-origin: center;');

            let text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text2.setAttributeNS(null, 'id', 'busNum');
            text2.setAttributeNS(null, 'x', '50%');
            text2.setAttributeNS(null, 'y', '51%');
            text2.setAttributeNS(null, 'dominant-baseline', 'middle');
            text2.setAttributeNS(null, 'text-anchor', 'middle');
            text2.setAttributeNS(null, 'fill', gradientColor); // Change
            text2.setAttributeNS(null, 'font-size', '150');
            text2.setAttributeNS(null, 'font-weight', '700');
            text2.setAttributeNS(null, 'font-family', '"Source Sans Pro", sans-serif');
            text2.textContent = bus.RouteShortName;

            markerSvg2.appendChild(busHolder2);
            markerSvg2.appendChild(text2);
            markerContainer2.appendChild(markerSvg2);

            let popup2 = new mapboxgl.Popup({ offset: 10 })
              .setText(bus.RouteShortName);

            let marker2 = new mapboxgl.Marker(markerContainer2, { offset: [0, 0] })
              .setLngLat([bus.Longitude, bus.Latitude])
              .setPopup(popup2);

            this.heatBusMarkers.push(marker2);

            marker2.getElement().addEventListener('click', () => {
              this.goToBus(map, bus);
            });
          });
        });
      });
    });
  }

  goToBus(map, bus) {

    if (map.getLayer('route')) {
      map.removeLayer('route');
      map.removeSource('route');
    }

    this.needInfo = true;
    this.arrivalBuses = [];
    this.stopsForRoute = [];
    this.selectedTitle = bus.RouteShortName;
    this.selectedSubTitle = bus.Destination;
    this.selectedPassengerCount = Math.floor(bus.OnBoard / 60 * 100);
    this.selectedStatus = bus.DisplayStatus;

    this.busService.getStopsForBus(bus).then((stops: Stop[]) => {
      this.stopsForRoute = stops;
      let coords = [];

      stops.forEach(stop => {
        let lat = stop.Latitude;
        let long = stop.Longitude;

        let point = [long, lat];

        coords.push(point);
      });

      coords.push(coords[0]);

      let radius = [];

      let newCoords = coords.join(';');

      coords.forEach(c => {
        radius.push(20);
      });
      
      this.busService.getMatch(newCoords, radius, 'driving').then(matchedCoords => {
        map.addLayer({
          "id": "route",
          "type": "line",
          "source": {
            "type": "geojson",
            "data": {
              "type": "Feature",
              "properties": {},
              "geometry": matchedCoords
            }
          },
          "layout": {
            "line-join": "round",
            "line-cap": "round"
          },
          "paint": {
            "line-color": '#' + bus.Color,
            "line-width": 4
          }
        });
      });

    });

    if (bus.Deviation != 0) {
      this.selectedStatus = bus.DisplayStatus + ': ' + bus.Deviation + ' min';
    }

    if (bus.Deviation < 0) {
      this.selectedStatus = 'Early' + ': ' + -bus.Deviation + ' min';
    }





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
    this.mapRef.resize();
  }

  goToStop(map, stop) {

    if (map.getLayer('route')) {
      map.removeLayer('route');
      map.removeSource('route');
    }

    this.arrivalBuses = [];
    this.stopsForRoute = [];
    this.needInfo = true;
    this.selectedTitle = stop.Name;
    this.selectedSubTitle = stop.Description;
    this.selectedPassengerCount = null;
    this.selectedStatus = null;

    this.busService.getNextBusesForStop(stop.StopId).then((buses: Departure[]) => {
      this.arrivalBuses = buses;
    });


    map.flyTo({
      center: [stop.Longitude, stop.Latitude],
      offset: [0, -75],
      zoom: 15,
      speed: 2,
      curve: 1,
      easing(t) {
        return t;
      }
    });
    this.drawerState = DrawerState.Docked;
    this.mapRef.resize();
  }
}