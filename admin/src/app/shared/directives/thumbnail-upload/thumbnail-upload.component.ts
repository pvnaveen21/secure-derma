import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';
import { DeleteModelComponent } from '../delete-model/delete-model.component';
import { CommonService } from '@app/services/common/common.service';

@Component({
  selector: 'app-thumbnail-upload',
  imports: [
    CommonModule,
    LucideAngularModule,
    DeleteModelComponent,
  ],
  templateUrl: './thumbnail-upload.component.html',
  styleUrl: './thumbnail-upload.component.scss'
})
export class ThumbnailUploadComponent {
  @Input() label: any = ['Upload Thumbnail'];
  @Input() accept: string = 'image/*';
  @Input() showLabel: any = true
  @Output() thumbnailSelected = new EventEmitter<File | null>();
  @Output() deleteImgValue = new EventEmitter<File | null>();
  @Input() showDeleteIcon: any = true
  @Input() showErrorMesage: any = true
  @Input() download: any = false
  @Input() allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']; // default types
  @Input() allowedSize: { width: number; height: number } | null = null; // optional size check
  @ViewChild('deleteModel') deleteModel!: DeleteModelComponent;


  constructor(
    private commonService: CommonService
  ) {

  }


  errorMessage: any = ''
  headerText: any = 'Confirm Delete Banner'
  subText: any = 'Are you sure you want to delete this Banner? This action cannot be undone.'
  @Input() set fileUrl(value: any | null) {

    if (!value) {
      this.previewUrl = null;
      return;
    }

    if (value instanceof File) {
      this.previewUrl = URL.createObjectURL(value);
    }
    else if (typeof value === 'string') {
      this.previewUrl = value;
    }
    // debugger;


    // Case 1: API gives us a URL (string)
    if (typeof value?.thumb_nail === 'string') {
      this.previewUrl = value.thumb_nail;
    }
    // Case 2: A new File object is passed
    else if (value?.thumb_nail instanceof File) {
      this.previewUrl = URL.createObjectURL(value.thumb_nail);
    }
    // Case 3: Fallback - direct file field (if API response has .file as URL)
    else if (typeof value?.image === 'string') {
      this.previewUrl = value.image;
    }
    if (typeof value?.preview == 'string') {
      this.previewUrl = value?.preview
    }

    this.currentValueData = value
    console.log(this.currentValueData);
    
  }
  previewUrl: string | null = null;
  icons = Icons
  currentValueData: any = ''

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.allowedTypes.includes(file.type)) {
        this.errorMessage = `Invalid file type. Allowed: ${this.allowedTypes.join(', ')}`;
        input.value = '';
        this.thumbnailSelected.emit(null);
        return;
      }

      if (this.allowedSize) {
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = async () => {
          try {
            await img.decode();
            if (
              img.width != this.allowedSize!.width ||
              img.height != this.allowedSize!.height
            ) {
              this.errorMessage = `Invalid image size. Required ${this.allowedSize!.width}x${this.allowedSize!.height}px`;
              input.value = '';
              this.thumbnailSelected.emit(null);
            } else {
              this.errorMessage = '';
              this.thumbnailSelected.emit(file);
            }
          } catch (e) {
            this.errorMessage = 'Failed to read image dimensions.';
            this.thumbnailSelected.emit(null);
          }
        };
      } else {
        this.errorMessage = '';
        this.thumbnailSelected.emit(file);
      }
    }
  }


  triggerUpload(input: HTMLInputElement) {
    input.click();
  }
  deleteImg() {

    this.deleteModel.showModal()
  }
  confirmDelete(status: any) {

    // this.commonService.deleteUser(this.customer_id).subscribe({
    //   next: (response: any) => {
    //     this.submitAPILoading = false
    //     this.message.success(response.message);
    //     this.deleteModel.deleteModelStatus(true)
    //     this.handleCancel();
    //     this.customDataTable?.refreshTable()
    //   },
    //   error: (err: any) => {
    //     this.submitAPILoading = false
    //     this.deleteModel.deleteModelStatus(false)
    //   }
    // })
    this.previewUrl = null
    
    if (this.currentValueData?.id) {
      this.deleteImgValue.emit(this.currentValueData?.id)
    }
    else {
      this.previewUrl = null
      this.deleteModel.deleteModelStatus(true)
      this.deleteImgValue.emit(this.currentValueData?.id || true)
      this.thumbnailSelected.emit(null);
    }
  }
  downloadImg(url: string) {
    this.commonService.downloadImg(url);
  }



}
