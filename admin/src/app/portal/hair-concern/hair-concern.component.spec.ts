import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HairConcernComponent } from './hair-concern.component';

describe('HairConcernComponent', () => {
  let component: HairConcernComponent;
  let fixture: ComponentFixture<HairConcernComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HairConcernComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HairConcernComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
