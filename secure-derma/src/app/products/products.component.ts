import { isPlatformBrowser, NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { distinctUntilChanged, map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HorizontalScrollComponent } from '../shared/horizontal-scroll/horizontal-scroll.component';
import { Icons } from '../shared/icons';
import { Assets } from '../shared/assets';
import { ProductService } from '../services/product.service';
@Component({
  selector: 'app-products',
  imports: [
    LucideAngularModule,
    FormsModule,
    NzRateModule,
    NgClass,
    HorizontalScrollComponent,
    NzProgressModule,
    NzButtonModule, NzPopoverModule,
    NzDrawerModule,
    NzDividerModule,
    NzInputModule,
    NzCollapseModule,

  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
  icons = Icons
  assets = Assets
  selectedGramId: any = 0
  selectedImgId: any = 0
  currentImageIndex: any = ''
  mainViewImage: any = this.assets.secura.aq1
  categories: any = [{ image: this.assets.secura.aq1 }, { image: this.assets.secura.aq2 }, { image: this.assets.secura.aq1 }, { image: this.assets.secura.aq2 }, { image: this.assets.secura.aq1 }, { image: this.assets.secura.aq2 },]
  reviewsData: any = [
    {
      "rating": 5,
      "allowHalf": true,
      "title": "Perfect pigmentation",
      "description": "Love the shades, affordable product- got it for 60% off almost around 270rs. Very underrated product. Highly pigmented and has beautiful shimmers and matte shades.",
      "userName": "Sumita Lavaniya",
      "isVerifiedBuyer": true,
      "from": "Secura",
      "date": "8 Nov, 2025"
    },
    {
      "rating": 4.5,
      "allowHalf": true,
      "title": "Amazing quality",
      "description": "Really good texture and blendability. Totally worth the price.",
      "userName": "Priya Sharma",
      "isVerifiedBuyer": true,
      "from": "Mumbai",
      "date": "5 Nov, 2025"
    },
    {
      "rating": 4,
      "allowHalf": true,
      "title": "Value for money",
      "description": "Good for beginners and everyday use. Nicely pigmented.",
      "userName": "Amit Verma",
      "isVerifiedBuyer": true,
      "from": "Delhi",
      "date": "3 Nov, 2025"
    },
    {
      "rating": 4.5,
      "allowHalf": true,
      "title": "Loved the shades",
      "description": "Beautiful selection of colors. Works well for both day and night looks.",
      "userName": "Shalini N",
      "isVerifiedBuyer": false,
      "from": "Chennai",
      "date": "30 Oct, 2025"
    },
    {
      "rating": 5,
      "allowHalf": true,
      "title": "Highly pigmented",
      "description": "Smooth application and long lasting colors.",
      "userName": "Rahul Kumar",
      "isVerifiedBuyer": true,
      "from": "Hyderabad",
      "date": "29 Oct, 2025"
    },
    {
      "rating": 3.5,
      "allowHalf": true,
      "title": "Good but dusty",
      "description": "Pigmentation is great but some shades are a bit powdery.",
      "userName": "Neha Jain",
      "isVerifiedBuyer": true,
      "from": "Pune",
      "date": "28 Oct, 2025"
    },
    {
      "rating": 4,
      "allowHalf": true,
      "title": "Nice packaging",
      "description": "The packaging is strong and the shades are good.",
      "userName": "Karthik",
      "isVerifiedBuyer": false,
      "from": "Bengaluru",
      "date": "25 Oct, 2025"
    },
    {
      "rating": 5,
      "allowHalf": true,
      "title": "Best in this price",
      "description": "Absolutely stunning shades for the price range.",
      "userName": "Ananya R",
      "isVerifiedBuyer": true,
      "from": "Kolkata",
      "date": "22 Oct, 2025"
    },
    {
      "rating": 4.5,
      "allowHalf": true,
      "title": "Smooth and blendable",
      "description": "Very smooth texture. Shimmer shades are beautiful.",
      "userName": "Deepika Singh",
      "isVerifiedBuyer": true,
      "from": "Lucknow",
      "date": "20 Oct, 2025"
    },
    {
      "rating": 4,
      "allowHalf": true,
      "title": "Loved it",
      "description": "Affordable and high quality. Great for beginners.",
      "userName": "Aravind",
      "isVerifiedBuyer": false,
      "from": "Coimbatore",
      "date": "18 Oct, 2025"
    }
  ]
  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
    // private cdr: ChangeDetectorRef,
  ) { }

  selectedProduectValue: any = ''
  ngOnInit() {
    this.route.paramMap
      .pipe(
        map((params: any) => params.get('slug')),
        distinctUntilChanged()
      )
      .subscribe(slug => {
        if (!slug) return;

        this.selectedProduectValue = slug;

        if (isPlatformBrowser(this.platformId)) {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
        this.getProductDetail();
        // Get variant from queryParams (not paramMap)

      });
    // setInterval(()=>{
    //   if (this.drawerPlacement == 'right'){
    //     this.drawerPlacement='bottom'
    //   }
    //   else{
    //     this.drawerPlacement = 'right'
    //   }
    // },3000)
  }
  productData: any = []
  productDetailsMain: any = []
  currentPriceData: any = []
  sideImages: any = []
  getProductDetail() {
    this.productService.getProducetDetail(this.selectedProduectValue).subscribe({
      next: (response: any) => {
        console.log("PRO DETAIL", response);
        this.productData = response?.product;

        // Build side images array
        this.sideImages = response?.product?.gallery_images ? [...response?.product.gallery_images] : [];
        if (response?.product?.hover_image) {
          this.sideImages.unshift(response?.product?.hover_image);
        }
        if (response?.product?.thumbnail_image) {
          this.sideImages.unshift(response?.product?.thumbnail_image);
        }

        this.productDetailsMain = response?.product?.product_details;

        // Set default values
        this.currentPriceData = this.productDetailsMain?.[0];
        const defaultVariantId = this.productDetailsMain?.[0]?.id;

        // Handle query params
        this.route.queryParams.subscribe(queryParams => {
          const variantId = queryParams['variant'];

          if (variantId) {
            const variantIndex = this.findVariantIndex(variantId);

            if (variantIndex !== -1) {
              // Valid variant found in query params
              this.selectedGramId = variantId;
            } else {
              // Invalid variant in query params, use default
              this.selectedGramId = defaultVariantId;
              this.updateUrlWithVariant(this.selectedGramId);
            }
          } else {
            // No variant in query params, use default
            this.selectedGramId = defaultVariantId;
            this.updateUrlWithVariant(this.selectedGramId);
          }

          this.selectGram(this.selectedGramId);
        });

        console.log(this.productData.review_count);
      }
    });
    this.prepareRatingSummary();

  }
  ratingSummary: {
    star: number;
    count: number;
    percent: number;
  }[] = [];
  prepareRatingSummary() {
    const totalReviews = this.productData?.reviews?.total_count || 0;

    // initialize 5 → 1
    const ratingMap:any = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    // count ratings
    console.log(this.productData?.reviews?.data);
    
    this.productData?.reviews?.data?.forEach((review: any) => {
      ratingMap[review.rating]++;
    });

    // build summary
    this.ratingSummary = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: ratingMap[star],
      percent: totalReviews
        ? Math.round((ratingMap[star] / totalReviews) * 100)
        : 0
    }));
    console.log(this.ratingSummary);
    
  }


  findVariantIndex(variantId: any): number {
    return this.productDetailsMain?.findIndex((item: any) => item.id == variantId) ?? -1;
  }


  selectGram(value: any) {
    const getProductData = this.productDetailsMain?.find((item: any) => item.id == value);
    this.selectedGramId = value
    this.currentPriceData = getProductData
    this.updateUrlWithVariant(value);

  }
  updateUrlWithVariant(variantId: any) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: variantId },
      queryParamsHandling: 'merge', // Keep other query params if any
      replaceUrl: true // Set to true if you don't want to add to history
    });
  }
  timeoutRef: any; // Store timeout reference
  isImageChanging = false;  // Flag to trigger the animation

  selectImg(image: any, type: any) {
    if (this.currentImageIndex != type) {
      this.currentImageIndex = type
      // Clear previous timeout to prevent multiple triggers
      if (this.timeoutRef) {
        clearTimeout(this.timeoutRef);
        this.timeoutRef = null;
      }

      // Trigger animation flag to true
      this.isImageChanging = true;
      this.selectedImgId = type;

      // Update image **after** animation class is applied, with slight delay
      setTimeout(() => {
        // Update the image source
        this.mainViewImage = image;
      }, 0); // Instant image update after setting the class

      // Reset the animation flag after animation duration (400ms)
      this.timeoutRef = setTimeout(() => {
        this.isImageChanging = false;
        this.timeoutRef = null; // Clear timeout reference
      }, 400); // 400ms to match the animation duration
    }
  }

  panels = [
    {
      active: true,
      name: 'Product Description',
      disabled: false
    },
    {
      active: false,
      disabled: false,
      name: 'Key Benfits'
    },
    {
      active: false,
      disabled: false,
      name: 'How to Use'
    },
    {
      active: false,
      disabled: false,
      name: 'Key Ingredients'
    },
    // {
    //   active: false,
    //   disabled: true,
    //   name: 'This is panel header 3'
    // }
  ];
  expandIconPosition: 'start' | 'end' = 'end';
  isScrolled = false;
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.scrollY;  // Get the vertical scroll position
    if (scrollPosition > 360) {  // Show buttons after 200px of scroll
      this.isScrolled = true;
    } else {
      this.isScrolled = false;
    }
  }

  visible = false;
  drawerPlacement: any = 'right'

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
  }


}

