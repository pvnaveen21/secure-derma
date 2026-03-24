import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-delete-model',
  imports: [
    NzModalModule,
    LucideAngularModule,
    NzIconModule,
    NzButtonModule
  ],
  templateUrl: './delete-model.component.html',
  styleUrl: './delete-model.component.scss'
})
export class DeleteModelComponent {
  @Input() headerText: string = '';
  @Input() subText: string = '';
  @Output() confirmDelete = new EventEmitter();
  @Input() buttonName = 'Confirm';
  isVisible = false;
  icons = Icons;
  submitAPILoading = false;
  returnType: any = true;

  showModal(type?: any) {
    this.returnType = type;
    this.submitAPILoading = false;
    this.isVisible = true;
  }

  handleCancel(): void {
    this.submitAPILoading = false;
    this.isVisible = false;
  }

  deleteConfirm(): void {
    this.submitAPILoading = true;
    this.confirmDelete.emit(this.returnType);
  }

  deleteModelStatus(status: any) {
    if (status) {
      this.handleCancel();
    } else {
      this.submitAPILoading = false;
    }
  }
}
