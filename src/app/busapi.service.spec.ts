import { TestBed } from '@angular/core/testing';

import { BusapiService } from './busapi.service';

describe('BusapiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BusapiService = TestBed.get(BusapiService);
    expect(service).toBeTruthy();
  });
});
