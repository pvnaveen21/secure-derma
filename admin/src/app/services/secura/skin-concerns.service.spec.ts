import { TestBed } from '@angular/core/testing';

import { SkinConcernsService } from './skin-concerns.service';

describe('SkinConcernsService', () => {
  let service: SkinConcernsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SkinConcernsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
