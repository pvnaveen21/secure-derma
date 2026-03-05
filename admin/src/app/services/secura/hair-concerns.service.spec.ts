import { TestBed } from '@angular/core/testing';

import { HairConcernsService } from './hair-concerns.service';

describe('HairConcernsService', () => {
  let service: HairConcernsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HairConcernsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
