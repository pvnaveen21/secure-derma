import { NgClass } from '@angular/common';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { merge } from 'rxjs';
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
import { ProductTypeService } from '@app/services/secura/product-type.service';
import { CategorieService } from '@app/services/secura/categorie.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ThumbnailUploadComponent } from '@app/shared/directives/thumbnail-upload/thumbnail-upload.component';

@Component({
  selector: 'app-product-type',
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
    NzSelectModule,
    NzSwitchModule,
    ThumbnailUploadComponent
  ],
  templateUrl: './product-type.component.html',
  styleUrl: './product-type.component.scss'
})
export class ProductTypeComponent {

  /* ------------------------- ViewChild Templates ------------------------- */
  @ViewChild('actionTemplate', { static: true }) actionTemplate!: TemplateRef<any>;
  @ViewChild('showBannerTemplate', { static: true }) showBannerTemplate!: TemplateRef<any>;
  @ViewChild('showHomeTemplate', { static: true }) showHomeTemplate!: TemplateRef<any>;
  @ViewChild('showFilterTemplate', { static: true }) showFilterTemplate!: TemplateRef<any>;
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
    screenName: 'product-types',
    remoteUrl: '/product-types/',
    btnText: 'Add Product Types',
    btnIcon: this.icons.common.plus,
    viewZoneOption: false,
    status: false
  };

  // Delete Model Text
  headerText: string = 'Confirm Delete Product Type';
  subText: string = 'Are you sure you want to delete this Product Type? This action cannot be undone.';


  constructor(
    private productTypeService: ProductTypeService,
    private fb: FormBuilder,
    private message: NzMessageService,
    private categorieService: CategorieService,
  ) { }
  categoriesList: any = []
  ngOnInit() {
    this.getCategoriesList()
  }
  getCategoriesList() {
    this.categorieService.getAllCategories().subscribe({
      next: (response: any) => {
        this.categoriesList = response
      }
    })
  }
  /* ------------------------- Lifecycle ------------------------- */
  ngAfterViewInit() {
    setTimeout(() => this.loadColumns(), 10);
  }

  /* ------------------------- Table Columns ------------------------- */
  loadColumns(): void {
    this.customDataTableColumns = [
      {
        title: 'Product Type',
        property: 'product_type',
        isSortable: true,
        sortKey: 'product_type'
      },
      {
        title: 'Show Banner',
        property: 'show_banner',
        cellTemplate: this.showBannerTemplate
      },
      {
        title: 'Show in Shop by Concern',
        property: 'show_home',
        cellTemplate: this.showHomeTemplate
      },
      {
        title: 'Show Filter',
        property: 'show_filter',
        cellTemplate: this.showFilterTemplate
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
    this.executiveForm = this.fb.group({
      image: [data ? data.image : '', [Validators.required]],
      categorie: [data ? data.categorie : '', [Validators.required]],
      product_type: [data?.product_type || '', [Validators.required, Validators.maxLength(45)]],
      show_banner: [data ? data?.show_banner : false],
      show_home: [data ? data?.show_home : false],
      show_filter: [data ? data?.show_filter : false],
    });
    this.registerShowFilterDependency();
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
      this.productTypeService.addProductType(payload).subscribe({
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
      this.productTypeService.updateProductType(this.brandId, payload).subscribe({
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

  toggleShowBanner(row: any, checked: boolean) {
    this.updateRowFlags(row, { show_banner: checked }, 'showBannerLoading');
  }

  toggleShowHome(row: any, checked: boolean) {
    this.updateRowFlags(row, { show_home: checked }, 'showHomeLoading');
  }

  toggleShowFilter(row: any, checked: boolean) {
    if (row.show_banner || row.show_home) {
      row.show_filter = true;
      return;
    }
    this.updateRowFlags(row, { show_filter: checked }, 'showFilterLoading');
  }

  private updateRowFlags(
    row: any,
    changes: { show_banner?: boolean; show_home?: boolean; show_filter?: boolean },
    loadingKey: string
  ) {
    const previousValues = {
      show_banner: row.show_banner,
      show_home: row.show_home,
      show_filter: row.show_filter
    };
    const nextValues = {
      ...previousValues,
      ...changes
    };

    if (nextValues.show_banner || nextValues.show_home) {
      nextValues.show_filter = true;
    }

    row.show_banner = nextValues.show_banner;
    row.show_home = nextValues.show_home;
    row.show_filter = nextValues.show_filter;
    row[loadingKey] = true;

    this.productTypeService.updateProductTypeFlags(row.id, {
      show_banner: nextValues.show_banner,
      show_home: nextValues.show_home,
      show_filter: nextValues.show_filter
    }).subscribe({
      next: (response: any) => {
        row[loadingKey] = false;
        this.message.success(response.message);
      },
      error: (err: any) => {
        row.show_banner = previousValues.show_banner;
        row.show_home = previousValues.show_home;
        row.show_filter = previousValues.show_filter;
        row[loadingKey] = false;
        this.message.error(err?.message || 'Something went wrong!');
      }
    });
  }

  private registerShowFilterDependency() {
    const showBannerControl = this.executiveForm.get('show_banner');
    const showHomeControl = this.executiveForm.get('show_home');
    const showFilterControl = this.executiveForm.get('show_filter');

    if (!showBannerControl || !showHomeControl || !showFilterControl) {
      return;
    }

    merge(showBannerControl.valueChanges, showHomeControl.valueChanges).subscribe(() => {
      if (showBannerControl.value || showHomeControl.value) {
        showFilterControl.setValue(true, { emitEvent: false });
      }
    });
  }

  /* ------------------------- Delete ------------------------- */
  deleteAction(id: any) {
    this.deleteId = id;
    this.deleteModel.showModal();
  }

  confirmDelete(status: any) {
    this.productTypeService.deleteProductType(this.deleteId).subscribe({
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
    this.executiveForm?.get('image')?.setValue(file);
  }
  deleteImgValue(data: any) {

  }


}
