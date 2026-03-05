import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Assets } from '@app/shared/assets';
import { SvgLoad } from '@app/shared/assets/svg-load';
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
    NzButtonModule,
    SvgLoad
  ],
  templateUrl: './delete-model.component.html',
  styleUrl: './delete-model.component.scss'
})
export class DeleteModelComponent {
  @Input() headerText: string = '';
  @Input() subText: string = '';
  @Output() confirmDelete = new EventEmitter()
  @Input() buttonName = 'Confirm'
  isVisible = false;
  icons = Icons
  assets = Assets
  submitAPILoading: boolean = false;
  returnType: any = true
  constructor() { }
  ngOnInit() { }

  showModal(type?: any) {
    this.returnType = type
    this.submitAPILoading = false
    this.isVisible = true
  }

  handleCancel(): void {
    this.submitAPILoading = false
    this.isVisible = false;
  }

  deleteConfirm(): void {
    this.submitAPILoading = true;
    this.confirmDelete.emit(this.returnType)
  }

  deleteModelStatus(status: any) {
    if (status) {
      this.handleCancel()
    }
    else {
      this.submitAPILoading = false
    }

  }

}
