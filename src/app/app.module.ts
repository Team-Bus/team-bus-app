import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { IonBottomDrawerModule } from 'ion-bottom-drawer';
import { BusapiService } from './busapi.service';

import { HttpClientModule } from '@angular/common/http';

import { Geolocation } from '@ionic-native/geolocation/ngx';

import { InformationPageModule } from './information/information.module';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [BrowserModule, HttpClientModule, InformationPageModule, IonicModule.forRoot({
    mode: 'ios'
  }), AppRoutingModule, IonBottomDrawerModule],
  providers: [
    StatusBar,
    SplashScreen,
    HttpClientModule,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    BusapiService,
    Geolocation
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
