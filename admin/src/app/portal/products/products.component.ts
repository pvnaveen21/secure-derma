import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomDataTableColumn, CustomDataTableConfig } from '@app/interfaces/custom-data-table.interface';
import { CommonService } from '@app/services/common/common.service';
import { BrandsService } from '@app/services/secura/brands.service';
import { CategorieService } from '@app/services/secura/categorie.service';
import { HairConcernsService } from '@app/services/secura/hair-concerns.service';
import { ImportService } from '@app/services/secura/import.service';
import { IngredientService } from '@app/services/secura/ingredient.service';
import { ProductTypeService } from '@app/services/secura/product-type.service';
import { ProductService } from '@app/services/secura/product.service';
import { SkinConcernsService } from '@app/services/secura/skin-concerns.service';
import { CommonDataTableComponent } from '@app/shared/directives/common-data-table/common-data-table.component';
import { DeleteModelComponent } from '@app/shared/directives/delete-model/delete-model.component';
import { ControlMessagesComponent } from '@app/shared/directives/form-validation/control-messages.component';
import { InputSanitizeDirective } from '@app/shared/directives/Input-vaildation/input-sanitize.directive';
import { ThumbnailUploadComponent } from '@app/shared/directives/thumbnail-upload/thumbnail-upload.component';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-products',
  imports: [
    LucideAngularModule,
    NzPaginationModule,
    NzModalModule,
    CommonModule,
    NzEmptyModule,
    CommonDataTableComponent,
    NzToolTipModule,
    NzIconModule,
    NzDividerModule,
    NzSelectModule,
    ReactiveFormsModule,
    NzInputModule,
    ThumbnailUploadComponent,
    InputSanitizeDirective,
    NzDropDownModule,
    DeleteModelComponent,
    ControlMessagesComponent,
    NzSwitchModule
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {

  @ViewChild('imageTemplate', { static: true }) imageTemplate!: TemplateRef<any>;
  @ViewChild('viewOnTemplate', { static: true }) viewOnTemplate!: TemplateRef<any>;
  @ViewChild('trendingProductTemplate', { static: true }) trendingProductTemplate!: TemplateRef<any>;
  @ViewChild('bestSellerTemplate', { static: true }) bestSellerTemplate!: TemplateRef<any>;
  @ViewChild('actionTemplate', { static: true }) actionTemplate!: TemplateRef<any>;
  @ViewChild('deleteModel') deleteModel!: DeleteModelComponent;
  @ViewChild('custumtable') custumtable!: CommonDataTableComponent;
  selectedValue = null;
  icons = Icons
  isVisible = false;
  isSuccessVisible: any = false
  viewType: any = 1
  id!: number;
  selectedFile: any
  timerClear: any
  customDataTableColumns: CustomDataTableColumn[] = [];
  customDataTableConfig: CustomDataTableConfig = {
    screenName: 'dealers',
    remoteUrl: '/products/', // initialize empty
    btnText: 'Add Product',
    btnIcon: this.icons.common.upload,
    viewZoneOption: false,
    status: false
  };

  listDataCount: any = 0
  pageIndex = 1;
  pageSize = 10;
  Math = Math;
  uploadErrorData: any;
  submitAPILoading: any = false
  editUser: any = false
  brandsList: any = []
  productTypeList: any = []
  skinConcernList: any = []
  ingredientList: any = []
  hairConcernList: any = []
  categoriesList: any = []
  trendingStatus: any = false
  bestSellerStatus: any = false
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private commonService: CommonService,
    private importService: ImportService,
    private brandsService: BrandsService,
    private categorieService: CategorieService,
    private productTypeService: ProductTypeService,
    private skinConcernsService: SkinConcernsService,
    private hairConcernsService: HairConcernsService,
    private message: NzMessageService,
    private ingredientService: IngredientService,
    // secure
    private fb: FormBuilder,
    private productService: ProductService
  ) { }
  ngOnInit() {
    this.viewType = this.id ? 2 : 1
    if (this.viewType == 1) {
      // this.getUploadedList(0, 10)
    }
    // secura
    this.getBrandList()
    this.getCategoriesList()
    this.getProductTypeList()
    this.addProductForm()
    this.getSkinConcernsList()
    this.getHairConcernsList()
    this.getIngredientList()

  }

  // Delete Model Text
  headerText: string = 'Confirm Delete Brand';
  subText: string = 'Are you sure you want to delete this Brand? This action cannot be undone.';



  // secura
  productForm!: FormGroup;

  // productForm!: FormGroup;

  addProductForm(data?: any) {


    this.productForm = this.fb.group({
      trending_product: [data ? data?.trending_product : false],
      best_seller: [data ? data?.best_seller : false],
      brand_id: [data ? data.brand.id : '', [Validators.required]],
      categorie: [data ? data.categorie.id : '', [Validators.required]],
      product_type: [data ? data.product_type.id : '', [Validators.required]],
      product_name: [data ? data?.product_name : '', [Validators.required]],
      ingredient: [data ? data?.ingredient : [], [Validators.required]],
      skin_concern: [data ? data.skin_concern : []],
      hair_concern: [data ? data.hair_concern : []],
      thumbnail_image: [data ? data.thumbnail_image : '', [Validators.required]],
      hover_image: [data ? data.hover_image : '', [Validators.required]],
      images: this.fb.array([]),
      product_description: [data ? data.product_description : '', [Validators.required]],
      key_benefits: this.fb.array([]),
      key_ingredients: this.fb.array([]),
      how_to_use: this.fb.array([]),
      product_details: this.fb.array([])


    });
    if (data) {
      this.editImages(data.images)
      this.editProductDetails(data.details)
      this.editKeyBenefits(data?.key_benefits)
      this.editKeyIngredients(data?.key_ingredients)
      this.editHowToUse(data?.how_to_use)

    }
    else {
      this.addImage();
      this.addProductDetails();
      this.addKeyBenefits();
      this.addKeyIngredients();
      this.addHowTouse()
    }
  }
  editImages(data: any) {
    data.forEach((value: any) => {
      this.addImage(value);
    })
    this.addImage()
  }
  editProductDetails(data: any) {
    data.forEach((value: any) => {
      this.addProductDetails(value);
    })
  }
  editKeyBenefits(data?: any) {
    data.forEach((value: any) => {
      this.addKeyBenefits(value)
    })
    if (data.length == 0) {
      this.addKeyBenefits()
    }
  }
  editHowToUse(data?: any) {
    data.forEach((value: any) => {
      this.addHowTouse(value)
    })
    if (data.length == 0) {
      this.addHowTouse()
    }
  }
  editKeyIngredients(data?: any) {
    data.forEach((value: any) => {
      this.addKeyIngredients(value)
    })
    if (data.length == 0) {
      this.addKeyIngredients()
    }
  }

  addKeyBenefitsBtn() {
    if (!this.iskeyBenefitsValid()) {
      this.message.error('Some key Benefits fields are invalid')
      return
    }
    this.addKeyBenefits()
  }
  addHowToUseBtn() {
    if (!this.isHowToUseValid()) {
      this.message.error('Some key how to use fields are invalid')
      return
    }
    this.addHowTouse()
  }

  addKeyIngredientsBtn() {
    if (!this.iskeyIngredientsValid()) {
      this.message.error('Some Key Ingredients fields are invalid')
      return
    }
    this.addKeyIngredients()
  }
  iskeyIngredientsValid() {
    return this.keyIngredientsArray.valid;
  }
  iskeyBenefitsValid() {
    return this.keyBenefitArray.valid;
  }
  isHowToUseValid() {
    return this.howToUseArray.valid;

  }

  addKeyIngredients(data?: any) {
    this.keyIngredientsArray.push(
      this.fb.group({
        value: [data ? data : '', Validators.required]
      })
    );
  }
  addKeyBenefits(data?: any) {
    this.keyBenefitArray.push(
      this.fb.group({
        value: [data ? data : '', Validators.required]
      })
    );
  }
  addHowTouse(data?: any) {
    this.howToUseArray.push(
      this.fb.group({
        value: [data ? data : '', Validators.required]
      })
    );
  }




  get productDetailsArray(): FormArray {
    return this.productForm.get('product_details') as FormArray;
  }

  get imagesArray(): FormArray {
    return this.productForm.get('images') as FormArray;
  }
  get keyBenefitArray(): FormArray {
    return this.productForm.get('key_benefits') as FormArray;
  }
  get keyIngredientsArray(): FormArray {
    return this.productForm.get('key_ingredients') as FormArray;
  }
  get howToUseArray(): FormArray {
    return this.productForm.get('how_to_use') as FormArray;
  }


  addImage(data?: any) {

    this.imagesArray.push(
      this.fb.group({
        index: this.imagesArray.length,
        id: [data ? data.id : ''],
        file: [],
        preview: [data ? data.image : '']
      })
    );
  }

  // Remove this line - we'll handle it differently
  // discountInput:any = true
  addProductDetailsBtn() {
    if (!this.isProductDetailsValid()) {
      this.message.error('Some product details fields are invalid')
      return
    }
    this.addProductDetails()

  }
  addProductDetails(data?: any) {
    const group = this.fb.group({
      id: [data ? data.id : ''],
      product_weight: [data?.product_weight || '', [Validators.required]],
      weight_type: [data?.weight_type || 'gm', [Validators.required]],
      combo: [data?.combo || [], [Validators.required]],
      original_price: [data?.original_price || '', [Validators.required]],
      selling_price: [data?.selling_price || '', [Validators.required]],
      discount_price: [data?.discount_price || 0, [Validators.required]],
      available_stock_count: [data?.available_stock_count || '', [Validators.required]],
    });

    this.productDetailsArray.push(group);

    // 👉 Auto-calc discount price
    group.get('original_price')?.valueChanges.subscribe(() => {
      this.updateDiscountPrice(group);
    });

    group.get('selling_price')?.valueChanges.subscribe(() => {
      this.updateDiscountPrice(group);
    });

  }

  updateDiscountPrice(group: FormGroup) {
    const original = Number(group.get('original_price')?.value) || 0;
    const selling = Number(group.get('selling_price')?.value) || 0;

    if (original > 0 && selling > 0 && original >= selling) {
      const discount = ((original - selling) / original) * 100;
      const roundedDiscount = Math.round(discount); // Round to nearest integer
      group.get('discount_price')?.setValue(roundedDiscount, { emitEvent: true });
    } else {
      group.get('discount_price')?.setValue(null, { emitEvent: true });
    }
  }


  // Optional: Method to enable/disable discount_price
  toggleDiscountInput(enable: boolean, index: number) {
    const discountControl = this.productDetailsArray.at(index).get('discount_price');
    if (enable) {
      discountControl?.enable();
    } else {
      discountControl?.disable();
    }
  }
  findInvalidControls() {
    const invalid = [];
    const controls = this.productForm.controls;

    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }
    return invalid;
  }

  submitBoolean: any = false
  submitForm() {
    this.submitBoolean = true
    this.productForm.markAllAsTouched()

    if (!this.isProductDetailsValid()) {
      this.message.error('Some product details fields are invalid')
      return
    }
    if (this.productForm.invalid || this.additionalImageCheck()) return;
    if (this.productDetailsArray.length == 0) {
      this.message.error('product details fields are must')
      return;
    }

    if (this.editUser) {
      this.updateProduct()
      this.deleteEditImages()
      this.deleteProductDeatail()
    }
    else {
      this.addProduct()
    }
  }
  isProductDetailsValid() {

    return this.productDetailsArray.valid;
  }

  additionalImageCheck() {
    return this.imagesArray.controls.length < 4 ||
      this.imagesArray.controls.slice(0, 3).some(c => !c.value);
  }

  deleteProductDeatail() {

    if (this.productDeatailDeleteIds.length > 0) {
      this.productDeatailDeleteIds.forEach((id: any) => {
        this.productService.deleteSingleProduct(id).subscribe()
      })
    }
  }
  deleteEditImages() {
if (this.imagesDeleteIds.length > 0) {
      this.imagesDeleteIds.forEach((id: any) => {
        this.productService.deleteSingleImage(id).subscribe()
      })
    }
  }

  updateProduct() {
    const payload = this.productForm.getRawValue()
    this.productService.updateProduct(payload, this.editId).subscribe({
      next: (response: any) => {
        this.handleCancel()
        this.custumtable.refreshTable()
      }
    })
  }

  getBrandList() {
    this.brandsService.getAllBrands().subscribe({
      next: (response: any) => {
        this.brandsList = response

      }
    })
  }
  getCategoriesList() {
    this.categorieService.getAllCategories().subscribe({
      next: (response: any) => {
        this.categoriesList = response
      }
    })
  }

  getProductTypeList() {
    this.productTypeService.getAllProductType().subscribe({
      next: (response: any) => {
        this.productTypeList = response

      }
    })

  }
  getSkinConcernsList() {
    this.skinConcernsService.getAllSkinConcerns().subscribe({
      next: (response: any) => {
        this.skinConcernList = response

      }
    })
  }
  getIngredientList() {
    this.ingredientService.getAllIngredient().subscribe({
      next: (response: any) => {
        this.ingredientList = response

      }
    })
  }
  getHairConcernsList() {
    this.hairConcernsService.getAllHairConcerns().subscribe({
      next: (response: any) => {
        this.hairConcernList = response


      }
    })
  }

  onThumbnailSelected(file: File | null) {
    this.productForm?.get('thumbnail_image')?.setValue(file);


    // if (file) {
    //   this.previewUrl = URL.createObjectURL(file);
    // }
  }
  selectedHoverImage(file: File | null) {
    this.productForm?.get('hover_image')?.setValue(file);


    // if (file) {
    //   this.previewUrl = URL.createObjectURL(file);
    // }
  }

  selectedMoreImages(file: File | null, index: any) {
    const selectedItem = this.imagesArray.at(index);
    // Example update
    if (file) {
      selectedItem.patchValue({
        file,
        preview: URL.createObjectURL(file)
      });
    }
    const statusCheck = this.imagesArray.value.every((value: any) => {
      return value.preview
    })
    if (statusCheck) {
      this.addImage()
    }



  }

  deleteImgValue(data: any) {
  }
  imagesDeleteIds: any = []
  deleteAddedimagesValue(data: any, index: any) {

    if (data) {
      this.imagesDeleteIds.push(data)
    }
    this.imagesArray.removeAt(index);
  }

  addProduct() {
    const payload = this.productForm.getRawValue()

    this.productService.addProduct(payload).subscribe({
      next: (response: any) => {
        this.handleCancel()
        this.custumtable.refreshTable()
      }
    })
  }
  productDeatailDeleteIds: any = []
  removeProductDetail(data: any, index: any) {
    if (data.id) {
      this.productDeatailDeleteIds.push(data.id)
    }
    this.productDetailsArray.removeAt(index);
    if (this.productDetailsArray.value.length == 0) {
      this.message.error('Atleast one product details fields are required')
      this.addProductDetails()
    }

  }
  removeKeybenefit(data: any, index: any) {

    this.keyBenefitArray.removeAt(index);
    if (this.keyBenefitArray.value.length == 0) {
      this.message.error('Atleast one keybenefits fields are required')
      this.addKeyBenefits()
    }

  }
  removeHowToUse(data: any, index: any) {
    this.howToUseArray.removeAt(index);
    if (this.howToUseArray.value.length == 0) {
      this.message.error('Atleast one how to use fields are required')
      this.addHowTouse()
    }

  }

  removeKeyIngredients(data: any, index: any) {

    this.keyIngredientsArray.removeAt(index);
    if (this.keyIngredientsArray.value.length == 0) {
      this.message.error('Atleast one key Ingredients fields are required')
      this.addKeyIngredients()
    }

  }



  ngAfterViewInit(): void {
    this.customDataTableColumns = [
      {
        title: 'Brand',
        property: 'brand.brand_name',
        isSortable: true,
        sortKey: 'id'
      },
      {
        title: 'Product Name',
        property: 'product_name',
        isSortable: true,
        sortKey: 'full_name'
      },
      {
        title: 'Product Type',
        property: 'product_type.product_type',
        isSortable: true,
        sortKey: 'full_name'
      },
      {
        title: 'Product Image',
        property: '',
        sortKey: 'reorder_count',
        cellTemplate: this.imageTemplate

      },

      {
        title: 'Trending Product',
        property: 'trending_product',
        // isSortable: true,
        sortKey: 'trending_product',
        cellTemplate: this.trendingProductTemplate
      },

      {
        title: 'Best Seller',
        property: 'best_seller',
        // isSortable: true,
        sortKey: 'best_seller',
        cellTemplate: this.bestSellerTemplate
      },
      {
        title: '',
        property: 'actions',
        cellTemplate: this.actionTemplate
      }
    ]
  }

  editAction(data: any) {
    this.editUser = true;
    this.showModal(data);
  }
  editId: any

  showModal(data?: any): void {
    this.productForm?.reset();
    this.editId = data?.id;
    this.isVisible = true;
    this.addProductForm(data)
  }
  deleteId: any
  deleteAction(id: any) {
    this.deleteId = id;
    this.deleteModel.showModal();
  }

  confirmDelete(status: any) {
    this.productService.deleteProduct(this.deleteId).subscribe({
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


  modelAction(event: { actionKey: string; rowData: any }) {
    this.productReset()
    this.editUser = false;
    this.showModal();
  }
  productReset() {
    this.submitBoolean = false
    this.productForm?.reset();
  }

  showUploadModal(): void {
    this.isVisible = true;
  }

  handleOk(): void {
    this.isVisible = false;
  }

  handleSuccessCancel(): void {
    this.isSuccessVisible = false;
  }

  showSuccessModal(): void {
    this.isSuccessVisible = true;
  }

  handleSuccessOk(): void {
    this.isSuccessVisible = false;
  }
  handleSucessCancel() {
    clearInterval(this.timerClear)
    this.isSuccessVisible = false;
  }

  handleCancel(): void {
    this.isVisible = false;
  }



  onVideoSelected(file: File | null) {
    // if (file && file != null) {
    this.selectedFile = file

    // }
  }

  listData: any = [];

  getUploadedList(offSet: any, limit: any) {
    this.commonService.fileUploadList({ upload_type: "product" }, offSet, limit).subscribe({
      next: (data: any) => {
        this.listData = data.results;
        this.listDataCount = data.count
      },
      error: (error: any) => {
      }
    })

  }

  uploadFile() {
    this.commonService.fileUpload(this.selectedFile, 'product', true).subscribe({
      next: (response: any) => {
        this.handleCancel()
        this.showSuccessModal()
        this.timerClear = setTimeout(() => {
          if (this.isSuccessVisible) {
            this.isSuccessVisible = false
          }
        }, 5000)
        this.getUploadedList(0, 10);
      }
    })

  }
  onPageIndexChange(newPage: number) {
    this.pageIndex = newPage;
    const offSet = (this.pageIndex - 1) * this.pageSize;
    this.getUploadedList(offSet, this.pageSize);
  }

  onPageSizeChange(newSize: number) {
    this.pageSize = newSize;
    this.pageIndex = 1; // reset to first page
    this.getUploadedList(0, this.pageSize);
  }


  importProducet() {
    this.uploadFile()
  }

  view(id: any) {
    this.router.navigate([`/products/${id}`])
  }
  accHistory() {
    this.router.navigate([`/products`])
  }

  // openRecord(data: any) {
  //   this.importService.openImportErrorModal(data).subscribe({
  //     next: (response: any) => {
  //       this.uploadErrorData = response;
  //     }
  //   })
  // }

  onTooltipVisibleChange(type: any, data: any): void {
    if (type) {
      this.importService.openImportErrorModal(data).subscribe({
        next: (response: any) => {
          this.uploadErrorData = response;
        },
        error: () => {
          this.uploadErrorData = { error: 'Failed to load error details' };
        }
      });
    }
  }
  headerBtnStatus(type: number, value: boolean) {

    if (type === 1) {
      this.trendingStatus = value;
    }
    else if (type === 2) {
      this.bestSellerStatus = value;
    }
    this.customDataTableConfig.remoteParams = {
      ...this.customDataTableConfig.remoteParams,
      ...(this.trendingStatus !== undefined && {
        trending_product: this.trendingStatus
      }),
      ...(this.bestSellerStatus !== undefined && {
        best_seller: this.bestSellerStatus
      }),
    };

    this.custumtable.refreshTable();
  }




}

