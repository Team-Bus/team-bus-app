import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { IonBottomDrawerModule } from 'ion-bottom-drawer';

import { HomePage } from './home.page';
import { InformationPage } from '../information/information.page';
import { InformationPageModule } from '../information/information.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InformationPageModule,
    IonBottomDrawerModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage
      }
    ])
  ],
  declarations: [HomePage],
  entryComponents: [InformationPage]
})
export class HomePageModule {}
