import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteModelComponent } from '@app/shared/directives/delete-model/delete-model.component';

describe('DeleteModelComponent', () => {
  let component: DeleteModelComponent;
  let fixture: ComponentFixture<DeleteModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteModelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
