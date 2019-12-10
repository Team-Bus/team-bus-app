import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { DrawerState } from 'ion-bottom-drawer';
import mapboxgl from 'mapbox-gl';
import { BusapiService, Departure, Stop, Bus } from '../busapi.service';
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
  dockedHeight = 350;
  distanceTop = 70;
  drawerState = DrawerState.Bottom;
  states = DrawerState;
  minimumHeight = 150;

  selectedTitle = 'Loading Stop'
  selectedSubTitle = 'Loading Stop'
  selectedPassengerCount = 1234;
  selectedStatus = 'Late';
  needInfo = true;

  routeMode = false;

  selectedItem = null;

  showNormal = true;

  mapRef = null;

  route = null;

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

  constructor(public navCtrl: NavController, private busService: BusapiService, private geolocation: Geolocation, public modalController: ModalController, public toastController: ToastController) { }

  async openModal() {
    const modal = await this.modalController.create({
      component: InformationPage
    });
    return await modal.present();
  }

  refreshMap() {
    this.presentToast("Refreshing Bus Positions");

    this.busService.getBuses().then(buses => {
      this.colorBusMarkers.forEach(bus => {
        let matchingBus = null;
        this.busService.sortedBuses.forEach(sortedBus => {
          if(sortedBus.Latitude == bus._lngLat.lat && sortedBus.Longitude == bus._lngLat.lng) {
            matchingBus = sortedBus;
          }
        });

        let newBuses = buses as Bus[];

        newBuses.forEach(newBus => {
          if(matchingBus.VehicleId == newBus.VehicleId) {
            bus.setLngLat([newBus.Longitude, newBus.Latitude])
          }
        });

      });

      this.heatBusMarkers.forEach(bus => {
        let matchingBus = null;
        this.busService.sortedBuses.forEach(sortedBus => {
          if(sortedBus.Latitude == bus._lngLat.lat && sortedBus.Longitude == bus._lngLat.lng) {
            matchingBus = sortedBus;
          }
        });

        let newBuses = buses as Bus[];

        newBuses.forEach(newBus => {
          if(matchingBus.VehicleId == newBus.VehicleId) {
            bus.setLngLat([newBus.Longitude, newBus.Latitude])
          }
        });
      });
    });
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

  exitRoute() {
    this.routeMode = false;
    this.route = null;

    this.drawerState = DrawerState.Bottom;

    if (this.mapRef.getLayer('route')) {
      this.mapRef.removeLayer('route');
      this.mapRef.removeSource('route');
    }

  }

  getRoute(map, stop) {

    this.busService.getClosestStop(this.userLocation.latitude, this.userLocation.longitude).then(cStop => {

      let nStop = new Stop(cStop);

      if (stop.StopId == nStop.StopId) {
        this.presentToast("This is already the closest stop to your location.");
        return;
      }

      this.busService.findRoute(stop, nStop).then(route => {
        this.route = route;
        this.routeMode = true;

        this.drawerState = DrawerState.Docked;

        if (this.mapRef.getLayer('route')) {
          this.mapRef.removeLayer('route');
          this.mapRef.removeSource('route');
        }

        let routeCoords = [];

        this.route.steps.forEach(step => {
          
          let aCoords = [step.arrivalCoords.lng, step.arrivalCoords.lat];
          routeCoords.push(aCoords);

          let dCoords = [step.departureCoords.lng, step.departureCoords.lat];
          routeCoords.push(dCoords);
        });

        let radius = [];

        let newCoords = routeCoords.join(';');

        routeCoords.forEach(c => {
          radius.push(20);
        });

        this.busService.getMatch(newCoords, radius, 'driving').then(matchedCoords => {
          this.mapRef.addLayer({
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
              "line-color": '#0000FF',
              "line-width": 4
            }
          });
        });
      });
    });
  }

  async presentToast(text: string) {
    const toast = await this.toastController.create({
      message: text,
      position: 'middle',
      duration: 2000
    });
    toast.present();
  }

  ionViewDidEnter() {

    let t = this;
    setInterval(function() {t.refreshMap();}, 300000);

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

            let busBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            busBackground.setAttribute('id', 'svg_5');
            busBackground.setAttribute('height', '221');
            busBackground.setAttribute('width', '295');
            busBackground.setAttribute('y', '146');
            busBackground.setAttribute('x', '108');
            busBackground.setAttribute('stroke-width', '0');
            busBackground.setAttribute('stroke', '#000000');
            busBackground.setAttribute('fill', '#ffffff')

            busHolder.appendChild(busBackground);
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

            let busBackground2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            busBackground2.setAttribute('id', 'svg_5');
            busBackground2.setAttribute('height', '221');
            busBackground2.setAttribute('width', '295');
            busBackground2.setAttribute('y', '146');
            busBackground2.setAttribute('x', '108');
            busBackground2.setAttribute('stroke-width', '0');
            busBackground2.setAttribute('stroke', '#000000');
            busBackground2.setAttribute('fill', '#ffffff')

            busHolder2.appendChild(busBackground2);
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

      if (!this.routeMode) {
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
      }

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

    if (!this.routeMode) {
      if (map.getLayer('route')) {
        map.removeLayer('route');
        map.removeSource('route');
      }
    }

    this.arrivalBuses = [];
    this.stopsForRoute = [];
    this.needInfo = true;
    this.selectedItem = stop;
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