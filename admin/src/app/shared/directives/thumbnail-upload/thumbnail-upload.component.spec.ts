import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThumbnailUploadComponent } from './thumbnail-upload.component';

describe('ThumbnailUploadComponent', () => {
  let component: ThumbnailUploadComponent;
  let fixture: ComponentFixture<ThumbnailUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThumbnailUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThumbnailUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
