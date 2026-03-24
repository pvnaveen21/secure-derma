import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomDataTableColumn, CustomDataTableConfig } from '@app/interfaces/custom-data-table.interface';
import { ReviewService } from '@app/services/secura/review.service';
import { CommonDataTableComponent } from '@app/shared/directives/common-data-table/common-data-table.component';
import { DeleteModelComponent } from '@app/shared/directives/delete-model/delete-model.component';
import { InputSanitizeDirective } from '@app/shared/directives/Input-vaildation/input-sanitize.directive';
import { ThumbnailUploadComponent } from '@app/shared/directives/thumbnail-upload/thumbnail-upload.component';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRateModule } from 'ng-zorro-antd/rate';

@Component({
  selector: 'app-review',
  imports: [
    CommonDataTableComponent,
    LucideAngularModule,
    NzDropDownModule,
    DeleteModelComponent,
    NzModalModule,
    NzRateModule,
    FormsModule,
    NzInputModule,
    ReactiveFormsModule,
    ThumbnailUploadComponent

  ],
  templateUrl: './review.component.html',
  styleUrl: './review.component.scss'
})
export class ReviewComponent {
  @ViewChild('actionTemplate', { static: true }) actionTemplate!: TemplateRef<any>;
  @ViewChild('imageTemplate', { static: true }) imageTemplate!: TemplateRef<any>;
  @ViewChild('reviewImageTemplate', { static: true }) reviewImageTemplate!: TemplateRef<any>;
  @ViewChild('reviewActionTemplate', { static: true }) reviewActionTemplate!: TemplateRef<any>;
  @ViewChild('deleteModel') deleteModel!: DeleteModelComponent;
  @ViewChild('custumtable', { static: false }) custumtable!: CommonDataTableComponent;


  icons = Icons
  viewReviews: any = false
  // Delete Model Text
  headerText: string = 'Confirm Delete Review';
  subText: string = 'Are you sure you want to delete this Review? This action cannot be undone.';


  customDataTableColumns: CustomDataTableColumn[] = [];
  reviewDataTableColumns: CustomDataTableColumn[] = [];
  customDataTableConfig: CustomDataTableConfig = {
    screenName: 'dealers',
    remoteUrl: '/products/', // initialize empty
    // btnText: 'Add Product',
    btnIcon: this.icons.common.upload,
    viewZoneOption: false,
    status: false
  };


  customReviewDataTableConfig: CustomDataTableConfig = {
    screenName: 'dealers',
    remoteUrl: '/products/', // initialize empty
    btnText: 'Add Review',
    btnIcon: this.icons.common.plus,
    viewZoneOption: false,
    status: false
  };
  constructor(
    private message: NzMessageService,
    private fb: FormBuilder,
    private reviewService: ReviewService
  ) {

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
        title: '',
        property: 'actions',
        cellTemplate: this.actionTemplate
      }
    ]

  }
  reviewProdutDetails: any
  view(data: any) {
    this.reviewProdutDetails = data
    this.viewReviews = true
    this.customReviewDataTableConfig.remoteUrl = `/products/${data.id}/reviews/`
    this.reviewTable()
  }

  reviewTable() {
    this.reviewDataTableColumns = [
      {
        title: 'Reviewer Name',
        property: 'reviewer_name',
        isSortable: true,
        sortKey: 'id'
      },
      {
        title: 'Rating',
        property: 'rating',
        isSortable: true,
        sortKey: 'rating'
      },
      {
        title: 'Review',
        property: 'review_text',
        isSortable: true,
        sortKey: 'review_text'
      },
      {
        title: 'Review Date',
        property: 'review_date',
        isSortable: true,
        sortKey: 'review_date',
        isDate:true
      },
      {
        title: 'Review Images',
        property: '',
        sortKey: 'reorder_count',
        cellTemplate: this.reviewImageTemplate

      },
      {
        title: '',
        property: 'actions',
        cellTemplate: this.reviewActionTemplate
      }
    ]
  }
  editData: any
  editReview(data: any) {
    this.editData = data
    this.showModal(data)

  }
  deleteId: any
  deleteReview(id: any) {
    this.deleteId = id;
    this.deleteModel.showModal();
  }
  isVisible: any = false
  editId: any = ''
  editUser: any = false

  showModal(data?: any): void {
    this.reviewForm?.reset();
    this.editId = data?.id;
    this.isVisible = true;
    this.buildReviewForm(data)
    if (data) {
      this.editUser = true
    }
  }

  showUploadModal(): void {
    this.isVisible = true;
  }

  handleOk(): void {
    this.isVisible = false;
  }

  handleCancel(): void {
    this.isVisible = false;
  }
  modelAction(event: { actionKey: string; rowData: any }) {
    // this.productReset()
    this.editUser = false;
    this.showModal();
  }


  confirmDelete(status: any) {
    this.reviewService.deleteReview(this.deleteId).subscribe({
      next: (response: any) => {
        this.deleteModel.deleteModelStatus(true)
        // this.submitAPILoading = false
        this.message.success(response.message);
        this.handleCancel();
        this.custumtable.refreshTable()
      }, error: () => {
        this.deleteModel.deleteModelStatus(false)
        // this.submitAPILoading = false
      }
    })
  }

  ratingValue = 0
  inputValue: any

  submitReview() {
    if (this.reviewForm.get('reviewer_name')?.invalid) {
      this.message.error('Please add Reviewer Name')
      return;
    }
    if (this.reviewForm.get('review_date')?.invalid) {
      this.message.error('Please add Review Date')
      return;
    }
    if (this.reviewForm.get('rating')?.value == 0) {
      this.message.error('Please add Rating')
      return;
    }

    if (this.editUser) {
      this.deleteEditImages()
      this.updateReview()
    }
    else {
      this.addReview()
    }



    // const payload = {
    //   product: this.productData.id,
    //   rating: this.ratingValue,
    //   feedback: this.inputValue.trim(),
    // }

    // this.productDetailsService.addfeedback(payload).subscribe({
    //   next: (response: any) => {
    //     this.message.success('Feedback added successfully');
    //     this.close()
    //   }
    // })
  }
  addReview() {
    const payload = this.reviewForm.getRawValue()
    this.reviewService.addReview(payload, this.reviewProdutDetails.id).subscribe({
      next: (response: any) => {
        this.handleCancel();
        this.custumtable.refreshTable()
      }
    })
  }
  updateReview() {
    const payload = this.reviewForm.getRawValue()
    this.reviewService.updateReview(payload, this.editId).subscribe({
      next: (response: any) => {
        this.handleCancel()
        this.custumtable.refreshTable()
      }
    })
  }
  deleteEditImages() {
    if (this.imagesDeleteIds.length > 0) {
      this.imagesDeleteIds.forEach((id: any) => {
        this.reviewService.deleteReviewImage(id).subscribe()
      })
    }
    this.imagesDeleteIds = []
    setTimeout(()=>{
      this.custumtable.refreshTable()
    },1000)
  }

  // review
  ngOnInit() {
    this.buildReviewForm();
  }
  reviewForm!: FormGroup

  buildReviewForm(data?: any) {
    this.reviewForm = this.fb.group({
      reviewer_name: [data ? data?.reviewer_name : '', [Validators.required]],
      review_date: [data ? data?.review_date : '', [Validators.required]],
      rating: [data ? data?.rating : 0, [Validators.required]],     // nz-rate value
      review_text: [data ? data?.review_text : ''],                       // optional
      images: this.fb.array([])                // multiple images
    });

    if (data) {
      data.images.forEach((value: any) => {
        this.addImage(value)
      })
      this.addImage()
    }
    else {
      this.addImage()
    }
  }

  get imagesArray() {
    return this.reviewForm.get('images') as FormArray;
  }

  addImage(data?: any) {
    this.imagesArray.push(
      this.fb.group({
        index: this.imagesArray.length,
        id: [data ? data.id : ''],
        file: [],
        preview: [data ? data.image : '']
      }));
  }

  removeImage(index: any) {
    this.imagesArray.removeAt(index);
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

  imagesDeleteIds: any = []
  deleteAddedimagesValue(data: any, index: any) {

    if (data) {
      this.imagesDeleteIds.push(data)
    }
    this.removeImage(index);

    const statusCheck = this.imagesArray.value.every((value: any) => {
      return value.preview
    })
    if (statusCheck) {
      this.addImage()
    }
  }



}
