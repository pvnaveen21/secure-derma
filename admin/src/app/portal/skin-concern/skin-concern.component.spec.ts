import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkinConcernComponent } from './skin-concern.component';

describe('SkinConcernComponent', () => {
  let component: SkinConcernComponent;
  let fixture: ComponentFixture<SkinConcernComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkinConcernComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkinConcernComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
