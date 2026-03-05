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

import { BrandsService } from '@app/services/secura/brands.service';
import { CommonDataTableComponent } from '@app/shared/directives/common-data-table/common-data-table.component';
import { DeleteModelComponent } from '@app/shared/directives/delete-model/delete-model.component';
import { ControlMessagesComponent } from '@app/shared/directives/form-validation/control-messages.component';
import { InputSanitizeDirective } from '@app/shared/directives/Input-vaildation/input-sanitize.directive';
import { Icons } from '@app/shared/icons';

// NG-ZORRO
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { LucideAngularModule } from 'lucide-angular';
@Component({
  selector: 'app-brand',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgClass,
    CommonDataTableComponent,
    NzDividerModule,
    LucideAngularModule,
    NzButtonModule,
    NzModalModule,
    NzInputModule,
    NzIconModule,
    NzSwitchModule,
    NzDropDownModule,
    InputSanitizeDirective,
    ControlMessagesComponent,
    DeleteModelComponent
  ],
  templateUrl: './brand.component.html',
  styleUrl: './brand.component.scss'
})
export class BrandComponent {

  /* ------------------------- ViewChild Templates ------------------------- */
  @ViewChild('brandStausTemplate', { static: true }) brandStausTemplate!: TemplateRef<any>;
  @ViewChild('brandImageTemplate', { static: true }) brandImageTemplate!: TemplateRef<any>;
  @ViewChild('topBrandTemplate', { static: true }) topBrandTemplate!: TemplateRef<any>;
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

  /* ------------------------- DataTable Config ------------------------- */
  customDataTableColumns: CustomDataTableColumn[] = [];

  customDataTableConfig: CustomDataTableConfig = {
    screenName: 'executives',
    remoteUrl: '/brands/',
    btnText: 'Add Brand',
    btnIcon: this.icons.common.plus,
    viewZoneOption: false,
    status: false
  };
  topBrandStatus: any = false

  // Delete Model Text
  headerText: string = 'Confirm Delete Brand';
  subText: string = 'Are you sure you want to delete this Brand? This action cannot be undone.';


  constructor(
    private brandsService: BrandsService,
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
        title: 'Brand Name',
        property: 'brand_name',
        isSortable: true,
        sortKey: 'brand_name'
      },

      {
        title: 'Brand Image',
        property: 'brand_image',
        isSortable: true,
        sortKey: 'brand_image',
        cellTemplate: this.brandImageTemplate

      },
      {
        title: 'Brand Status',
        property: 'show_brand',
        isSortable: true,
        sortKey: 'show_brand',
        cellTemplate: this.brandStausTemplate
      },
      {
        title: 'Top Brands',
        property: 'is_top_brand',
        // isSortable: true,
        sortKey: 'is_top_brand',
        cellTemplate: this.topBrandTemplate
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
    this.previewImage = null
    this.executiveForm = this.fb.group({
      brand_name: [data?.brand_name || '', [Validators.required, Validators.maxLength(45)]],
      brand_description: [data?.brand_description || '', [Validators.required, Validators.minLength(25)]],
      show_brand: [data?.show_brand ?? true],
      is_top_brand: [data?.is_top_brand ?? false],
      brand_image: [data?.brand_image || null, [Validators.required]]  // <-- new field
    });
    if (data?.brand_image) {
      this.previewImage = data.brand_image
    }
  }

  previewImage: string | ArrayBuffer | null = null;

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.message.error('Only JPG/PNG images are allowed!');
        return;
      }
      if (file.size / 1024 / 1024 > 2) {
        this.message.error('Image must be smaller than 2MB!');
        return;
      }

      this.executiveForm.patchValue({ brand_image: file });

      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }
  removeImage() {
    this.previewImage = null;
    this.executiveForm.patchValue({ brand_image: null });
  }


  /* ------------------------- Submit ------------------------- */
  onSubmitExe() {
    this.executiveForm.markAllAsTouched();
    if (this.editUser) {
      this.updateBrand();
    } else {
      this.addNewBrands();
    }
  }

  /* ------------------------- Add Brand ------------------------- */
  addNewBrands() {
    const payload = this.executiveForm.getRawValue();
    if (this.executiveForm.valid) {
      this.submitAPILoading = true;
      this.brandsService.addBrands(payload).subscribe({
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
    if (this.executiveForm.valid) {
      this.submitAPILoading = true;
      this.brandsService.updateBrands(this.brandId, payload).subscribe({
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
    this.brandsService.deleteBrand(this.deleteId).subscribe({
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

  headerBtnStatus(type: number, value: boolean) {

    if (type === 1) {
      this.topBrandStatus = value;
    }
    this.customDataTableConfig.remoteParams = {
      ...this.customDataTableConfig.remoteParams,
      ...(this.topBrandStatus !== undefined && {
        is_top_brand: this.topBrandStatus
      }),
    };

    this.custumtable.refreshTable();
  }
}
