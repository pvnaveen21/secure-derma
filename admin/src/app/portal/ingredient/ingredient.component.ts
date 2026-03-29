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
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { LucideAngularModule } from 'lucide-angular';
import { IngredientService } from '@app/services/secura/ingredient.service';

@Component({
  selector: 'app-ingredient',
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
    NzSwitchModule,
    InputSanitizeDirective,
    ControlMessagesComponent,
    DeleteModelComponent
  ],  templateUrl: './ingredient.component.html',
  styleUrl: './ingredient.component.scss'
})
export class IngredientComponent {

  /* ------------------------- ViewChild Templates ------------------------- */
  @ViewChild('actionTemplate', { static: true }) actionTemplate!: TemplateRef<any>;
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
    screenName: 'ingredient',
    remoteUrl: '/ingredient/',
    btnText: 'Add Ingredient',
    btnIcon: this.icons.common.plus,
    viewZoneOption: false,
    status: false
  };

  // Delete Model Text
  headerText: string = 'Confirm Delete Product Type';
  subText: string = 'Are you sure you want to delete this Product Type? This action cannot be undone.';


  constructor(
    private ingredientService: IngredientService,
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
        title: 'Ingredient',
        property: 'ingredient',
        isSortable: true,
        sortKey: 'ingredient'
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
      ingredient: [
        data?.ingredient || '',
        [Validators.required, Validators.maxLength(45)]
      ],
      show_filter: [data ? data?.show_filter : false]
    });
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
      this.ingredientService.addIngredient(payload).subscribe({
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
      this.ingredientService.updateIngredient(this.brandId, payload).subscribe({
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

  toggleShowFilter(row: any, checked: boolean) {
    const previousValue = row.show_filter;
    row.show_filter = checked;
    row.showFilterLoading = true;

    this.ingredientService.updateIngredient(row.id, {
      show_filter: checked
    }).subscribe({
      next: (response: any) => {
        row.showFilterLoading = false;
        this.message.success(response.message);
      },
      error: (err: any) => {
        row.show_filter = previousValue;
        row.showFilterLoading = false;
        this.message.error(err?.message || 'Something went wrong!');
      }
    });
  }

  /* ------------------------- Delete ------------------------- */
  deleteAction(id: any) {
    this.deleteId = id;
    this.deleteModel.showModal();
  }

  confirmDelete(status: any) {
    this.ingredientService.deleteIngredient(this.deleteId).subscribe({
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
}
