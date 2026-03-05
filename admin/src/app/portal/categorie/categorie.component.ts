import { NgClass } from '@angular/common';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import {
  CustomDataTableColumn,
  CustomDataTableConfig
} from '@app/interfaces/custom-data-table.interface';

import { CommonDataTableComponent } from '@app/shared/directives/common-data-table/common-data-table.component';
import { DeleteModelComponent } from '@app/shared/directives/delete-model/delete-model.component';
import { ControlMessagesComponent } from '@app/shared/directives/form-validation/control-messages.component';
import { InputSanitizeDirective } from '@app/shared/directives/Input-vaildation/input-sanitize.directive';
import { Icons } from '@app/shared/icons';

// NG-ZORRO
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { LucideAngularModule } from 'lucide-angular';
import { ThumbnailUploadComponent } from '@app/shared/directives/thumbnail-upload/thumbnail-upload.component';
import { CategorieService } from '@app/services/secura/categorie.service';

@Component({
  selector: 'app-categorie',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonDataTableComponent,
    LucideAngularModule,
    NzButtonModule,
    NzModalModule,
    NzInputModule,
    NzIconModule,
    NzDropDownModule,
    InputSanitizeDirective,
    ControlMessagesComponent,
    DeleteModelComponent,
    ThumbnailUploadComponent
  ],
  templateUrl: './categorie.component.html',
  styleUrl: './categorie.component.scss'
})
export class CategorieComponent {

  /* ------------------------- ViewChild Templates ------------------------- */
  @ViewChild('actionTemplate', { static: true }) actionTemplate!: TemplateRef<any>;
  @ViewChild('custumtable') custumtable!: CommonDataTableComponent;
  @ViewChild('deleteModel') deleteModel!: DeleteModelComponent;

  /* ------------------------- Variables ------------------------- */
  icons = Icons;
  isVisible = false;
  submitAPILoading = false;
  editUser = false;

  deleteId: any = '';
  brandId: any;

  executiveForm!: FormGroup;
  fileData: any = null

  /* ------------------------- DataTable Config ------------------------- */
  customDataTableColumns: CustomDataTableColumn[] = [];

  customDataTableConfig: CustomDataTableConfig = {
    screenName: 'categories',
    remoteUrl: '/categories/',
    btnText: 'Add Categorie',
    btnIcon: this.icons.common.plus,
    viewZoneOption: false,
    status: false
  };

  // Delete Model Text
  headerText: string = 'Confirm Delete Product Type';
  subText: string = 'Are you sure you want to delete this Product Type? This action cannot be undone.';


  constructor(
    private categorieService: CategorieService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) { }

  /* ------------------------- Lifecycle ------------------------- */
  ngAfterViewInit() {
    setTimeout(() => this.loadColumns(), 10);
  }

  /* ------------------------- Table Columns ------------------------- */
  loadColumns(): void {
    this.customDataTableColumns = [
      {
        title: 'Categorie',
        property: 'categorie',
        isSortable: true,
        sortKey: 'categorie'
      },
      {
        title: '',
        property: 'actions',
        cellTemplate: this.actionTemplate
      }
    ];
  }

  /* ------------------------- Modal Actions ------------------------- */
  modelAction(event: { actionKey: string; rowData: any }) {
    this.editUser = false;
    this.showModal();
  }

  showModal(data?: any): void {
    this.fileData = null;
    this.fileData = data?.image

    this.executiveForm?.reset();
    this.initForm(data);

    this.brandId = data?.id;
    this.isVisible = true;
  }

  handleCancel(): void {
    this.isVisible = false;
  }

  /* ------------------------- Form ------------------------- */
  initForm(data?: any) {
    this.executiveForm = this.fb.group({
      categorie: [data?.categorie || '', [Validators.required, Validators.maxLength(45)],
        // file:[]
      ],
    });
  }
  submitBoolean = false
  /* ------------------------- Submit ------------------------- */
  onSubmitExe() {
    this.executiveForm.markAllAsTouched();
    this.submitBoolean = true
    if (!this.executiveForm.valid) return
    if (!this.fileData) return
    if (this.editUser) {
      this.updateBrand();
    } else {
      this.addNewBrands();
    }
  }

  /* ------------------------- Add Brand ------------------------- */
  addNewBrands() {
    const payload = this.executiveForm.getRawValue();
    payload.image = this.fileData
    if (this.executiveForm.valid) {
      this.submitAPILoading = true;
      this.submitBoolean = false
      this.categorieService.addCategories(payload).subscribe({
        next: (response: any) => {
          this.message.success(response.message);
          this.submitAPILoading = false;
          this.custumtable.refreshTable();
          this.handleCancel();
        },
        error: (err: any) => {
          this.submitAPILoading = false;
          this.message.error(err?.message || "Something went wrong!");
        }
      });
    }
  }

  /* ------------------------- Update Brand ------------------------- */
  updateBrand() {
    const payload = this.executiveForm.getRawValue();
    payload.image = this.fileData

    if (this.executiveForm.valid) {
      this.submitAPILoading = true;
      this.categorieService.updateCategories(this.brandId, payload).subscribe({
        next: (response: any) => {
          this.message.success(response.message);
          this.submitAPILoading = false;
          this.custumtable.refreshTable();
          this.handleCancel();
        },
        error: (err: any) => {
          this.submitAPILoading = false;
          this.message.error(err?.message || "Something went wrong!");
        }
      });
    }
  }

  /* ------------------------- Edit ------------------------- */
  editAction(data: any) {
    this.editUser = true;
    this.showModal(data);
  }

  /* ------------------------- Delete ------------------------- */
  deleteAction(id: any) {
    this.deleteId = id;
    this.deleteModel.showModal();
  }

  confirmDelete(status: any) {
    this.categorieService.deleteCategories(this.deleteId).subscribe({
      next: (response: any) => {
        this.deleteModel.deleteModelStatus(true)
        this.submitAPILoading = false
        this.message.success(response.message);
        this.handleCancel();
        this.custumtable?.refreshTable();
      }, error: () => {
        this.deleteModel.deleteModelStatus(false)
        this.submitAPILoading = false
      }
    })
  }

  handleOk(): void {
    setTimeout(() => {
      this.isVisible = false;
    }, 1000);
  }

  onThumbnailSelected(file: File | null) {
    if (!file) return;
    this.fileData = file 
  }
  deleteImgValue(fileID: any,) {
    this.fileData =null
    // this.bannerService.deleteBanner(fileID).subscribe({
    //   next: () => this.removeFile(fileID, type)
    // });
  }
}
