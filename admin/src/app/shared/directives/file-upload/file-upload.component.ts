import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss'
})
export class FileUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() accept: string = '';
  @Input() maxSize: number = 10;
  @Input() label: any = ['Upload File'];
  @Output() fileSelected = new EventEmitter<File | null>();
  @Input() reUpload: any = false;
  @Input() showErrorMesage: any = true;
  @Input() showUploadFile: any = true;
  @Output() deleteVideoFile = new EventEmitter<File | null>();
  @Input() showDeleteIcon: boolean = true
  @Input() onlyFileName: any = false;


  @Input() set fileUrl(value: any | null) {
    this.selectedFile = value ? URL.createObjectURL(value?.video_file) : null;
    this.previewUrl = value ? URL.createObjectURL(value?.video_file) : null;
  }

  errorMessage: string = '';
  selectedFile: any = null;
  previewUrl: SafeUrl | null = null;

  icons = Icons;

  constructor(private sanitizer: DomSanitizer) { }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.errorMessage = '';

    if (this.accept) {
      const allowedTypes = this.accept.split(',').map(a => a.trim().toLowerCase());
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();

      const isValid = allowedTypes.some(type =>
        type.startsWith('.') ? fileName.endsWith(type) : fileType === type
      );

      if (!isValid) {
        this.errorMessage = this.showErrorMesage;
        this.resetFile(input);
        return;
      }
    }

    if (file.size > this.maxSize * 1024 * 1024) {
      this.errorMessage = `File must be less than ${this.maxSize} MB.`;
      this.resetFile(input);
      return;
    }

    // ✅ File + Sanitized Preview
    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
    this.fileSelected.emit(this.selectedFile);

    input.value = '';
  }

  resetFile(input: HTMLInputElement) {
    this.selectedFile = null;
    this.previewUrl = null;
    this.fileSelected.emit(null);
    input.value = '';
  }

  triggerUpload(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  addAnother() {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  deleteVideo() {
    this.previewUrl = null
    this.deleteVideoFile.emit(null);

  }
}
