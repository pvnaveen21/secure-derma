import { isPlatformBrowser, NgClass, NgIf } from '@angular/common';
import { Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { distinctUntilChanged, firstValueFrom, map } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HorizontalScrollComponent } from '../shared/horizontal-scroll/horizontal-scroll.component';
import { Icons } from '../shared/icons';
import { Assets } from '../shared/assets';
import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { PaymentService } from '../services/payment.service';
import { AuthService } from '../services/auth/auth.service';
@Component({
  selector: 'app-products',
  imports: [
    LucideAngularModule,
    FormsModule,
    NzRateModule,
    NgIf,
    NgClass,
    HorizontalScrollComponent,
    NzProgressModule,
    NzButtonModule, NzPopoverModule,
    NzDrawerModule,
    NzDividerModule,
    NzInputModule,
    RouterLink,
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
  private readonly productLoginIntentKey = 'secure_derma_resume_product_buy_now';
  readonly reviewPreviewCharacterLimit = 220;
  expandedReviews = new Set<number>();
  icons = Icons
  assets = Assets
  selectedGramId: any = 0
  selectedImgId: any = 0
  currentImageIndex: any = 0
  mainViewImage: any = ''
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
    private cartService: CartService,
    private paymentService: PaymentService,
    private authService: AuthService,
    private message: NzMessageService,
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
  productInfoSections: {
    key: string;
    title: string;
    eyebrow: string;
    summary: string;
    content: string;
    items: string[];
  }[] = [];
  activeProductInfoKey = 'description';
  addToCartLoading = false;
  buyNowLoading = false;
  get breadcrumbCollectionSlug() {
    const routeCollection = this.route.snapshot.queryParamMap.get('collection');

    if (routeCollection) {
      return routeCollection;
    }

    const candidate = this.productData?.product_type
      || this.productData?.category?.category_name
      || this.productData?.collection?.collection_name
      || '';

    return typeof candidate === 'string' ? this.slugify(candidate) : '';
  }

  get breadcrumbCollectionLabel() {
    const routeCollection = this.route.snapshot.queryParamMap.get('collection');

    if (routeCollection) {
      return routeCollection
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    const candidate = this.productData?.product_type
      || this.productData?.category?.category_name
      || this.productData?.collection?.collection_name
      || '';

    return typeof candidate === 'string' ? candidate : '';
  }

  get breadcrumbCollectionLink() {
    if (!this.breadcrumbCollectionSlug) {
      return ['/'];
    }

    return ['/collections', this.breadcrumbCollectionSlug];
  }

  getProductDetail() {
    this.productService.getProducetDetail(this.selectedProduectValue).subscribe({
      next: (response: any) => {
        this.productData = response?.product;
        this.buildProductInfoSections();
        this.prepareRatingSummary();

        // Build side images array
        this.sideImages = response?.product?.gallery_images ? [...response?.product.gallery_images] : [];
        if (response?.product?.hover_image) {
          this.sideImages.unshift(response?.product?.hover_image);
        }
        if (response?.product?.thumbnail_image) {
          this.sideImages.unshift(response?.product?.thumbnail_image);
        }
        this.sideImages = this.sideImages.filter((image: any, index: number, images: any[]) => {
          return Boolean(image) && images.indexOf(image) === index;
        });
        this.selectedImgId = 0;
        this.currentImageIndex = 0;
        this.mainViewImage = this.sideImages[0] || response?.product?.thumbnail_image || '';

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
      }
    });
  }
  ratingSummary: {
    star: number;
    count: number;
    percent: number;
  }[] = [];
  prepareRatingSummary() {
    const totalReviews = this.totalReviewCount;

    // initialize 5 → 1
    const ratingMap:any = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    // count ratings
    this.customerReviews.forEach((review: any) => {
      const roundedRating = Math.min(5, Math.max(1, Math.round(this.getReviewRating(review))));
      ratingMap[roundedRating]++;
    });

    // build summary
    this.ratingSummary = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: ratingMap[star],
      percent: totalReviews
        ? Math.round((ratingMap[star] / totalReviews) * 100)
        : 0
    }));
  }

  get customerReviews() {
    const apiReviews = this.productData?.reviews?.data;
    return Array.isArray(apiReviews) ? apiReviews : [];
  }

  get totalReviewCount() {
    return this.productData?.reviews?.total_count || this.productData?.review_count || this.customerReviews.length || 0;
  }

  get verifiedReviewCount() {
    return this.customerReviews.filter((review: any) => this.isVerifiedReview(review)).length;
  }

  get recommendationPercent() {
    if (!this.customerReviews.length) {
      return 0;
    }

    const positiveReviews = this.customerReviews.filter((review: any) => this.getReviewRating(review) >= 4).length;
    return Math.round((positiveReviews / this.customerReviews.length) * 100);
  }

  get ratingLabel() {
    const rating = Number(this.productData?.avg_rating || 0);

    if (rating >= 4.5) return 'Excellent overall';
    if (rating >= 4) return 'Very well rated';
    if (rating >= 3.5) return 'Generally liked';
    if (rating >= 3) return 'Mixed feedback';
    return 'Needs improvement';
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

  async addSelectedProductToCart(): Promise<void> {
    const normalizedProduct = this.getSelectedProductForCart();
    if (!normalizedProduct) {
      this.message.error('Select a valid variant before adding to cart.');
      return;
    }

    if (this.addToCartLoading) {
      return;
    }

    this.addToCartLoading = true;

    try {
      const result = await this.cartService.addToCart(normalizedProduct);

      switch (result.status) {
        case 'added':
          this.message.success(`${this.productData?.product_name || 'Item'} added to cart`);
          break;
        case 'updated':
          this.message.success(`${this.productData?.product_name || 'Item'} quantity updated in cart`);
          break;
        case 'limit_reached':
          this.message.info(`${this.productData?.product_name || 'Item'} is already at the maximum quantity`);
          break;
        default:
          this.message.error(`Unable to add ${this.productData?.product_name || 'this item'} right now`);
      }
    } catch {
      this.message.error(`Unable to add ${this.productData?.product_name || 'this item'} right now`);
    } finally {
      this.addToCartLoading = false;
    }
  }

  async buySelectedProductNow(): Promise<void> {
    const selectedDetail = this.getSelectedDetail();
    if (!selectedDetail?.id || !this.productData?.id) {
      this.message.error('Select a valid variant before continuing.');
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.message.warning('Please login to continue payment.');
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.productLoginIntentKey, '1');
      }
      this.authService.redirectUrl = this.router.url;
      this.router.navigate(['/account/login']);
      return;
    }

    if (this.buyNowLoading) {
      return;
    }

    this.buyNowLoading = true;

    try {
      await this.paymentService.loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK is unavailable.');
      }

      const order = await firstValueFrom(
        this.paymentService.createRazorpayOrder([
          {
            productId: this.productData.id,
            detailId: selectedDetail.id,
            quantity: 1
          }
        ])
      );

      const razorpay = new window.Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: 'Secure Derma',
        description: this.productData?.product_name || 'Product order',
        order_id: order.order_id,
        theme: {
          color: '#1a5944'
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await firstValueFrom(this.paymentService.verifyRazorpayPayment(response));
            this.message.success('Payment completed successfully.');
          } catch (error) {
            console.error('Payment verification failed:', error);
            this.message.error('Payment received, but verification failed. Please contact support.');
          } finally {
            this.buyNowLoading = false;
            if (typeof window !== 'undefined') {
              localStorage.removeItem(this.productLoginIntentKey);
            }
          }
        },
        modal: {
          ondismiss: () => {
            this.buyNowLoading = false;
          }
        }
      });

      razorpay.on('payment.failed', () => {
        this.buyNowLoading = false;
        this.message.error('Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (error) {
      console.error('Checkout failed:', error);
      this.buyNowLoading = false;
      this.message.error('Unable to start payment right now.');
    }
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
    if (!image) {
      return;
    }

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
    } else {
      this.selectedImgId = type;
      this.mainViewImage = image;
    }
  }

  buildProductInfoSections() {
    const description = this.normalizeSectionContent([
      this.getNestedValue(this.productData, 'product_description'),
      this.getNestedValue(this.productData, 'description'),
      this.getNestedValue(this.productData, 'details.description'),
      this.getNestedValue(this.productData, 'product_details.description'),
    ]);

    const benefits = this.normalizeSectionContent([
      this.getNestedValue(this.productData, 'key_benefits'),
      this.getNestedValue(this.productData, 'benefits'),
      this.getNestedValue(this.productData, 'product_benefits'),
      this.getNestedValue(this.productData, 'details.key_benefits'),
    ]);

    const howToUse = this.normalizeSectionContent([
      this.getNestedValue(this.productData, 'how_to_use'),
      this.getNestedValue(this.productData, 'usage_instructions'),
      this.getNestedValue(this.productData, 'directions'),
      this.getNestedValue(this.productData, 'details.how_to_use'),
    ]);

    const ingredients = this.normalizeSectionContent([
      this.getNestedValue(this.productData, 'key_ingredients'),
      this.getNestedValue(this.productData, 'ingredients'),
      this.getNestedValue(this.productData, 'active_ingredients'),
      this.getNestedValue(this.productData, 'details.ingredients'),
    ]);

    this.productInfoSections = [
      {
        key: 'description',
        title: 'Product Description',
        eyebrow: 'Overview',
        summary: description.summary || 'What this product is made for and where it fits in a routine.',
        content: description.content,
        items: description.items
      },
      {
        key: 'benefits',
        title: 'Key Benefits',
        eyebrow: 'Results',
        summary: benefits.summary || 'The main support this product is designed to provide.',
        content: benefits.content,
        items: benefits.items
      },
      {
        key: 'how-to-use',
        title: 'How to Use',
        eyebrow: 'Application',
        summary: howToUse.summary || 'Usage guidance for frequency, order, and application.',
        content: howToUse.content,
        items: howToUse.items
      },
      {
        key: 'ingredients',
        title: 'Key Ingredients',
        eyebrow: 'Formula',
        summary: ingredients.summary || 'Highlighted actives and supporting formula components.',
        content: ingredients.content,
        items: ingredients.items
      }
    ];

    if (!this.productInfoSections.some((section) => section.key === this.activeProductInfoKey)) {
      this.activeProductInfoKey = this.productInfoSections[0]?.key || 'description';
    }
  }

  normalizeSectionContent(values: any[]) {
    const value = values.find((item) => {
      if (Array.isArray(item)) {
        return item.length > 0;
      }

      return item !== null && item !== undefined && `${item}`.trim() !== '';
    });

    if (Array.isArray(value)) {
      const items = value
        .map((item) => this.cleanText(item))
        .filter(Boolean);

      return {
        summary: items[0] || '',
        content: '',
        items
      };
    }

    const cleaned = this.cleanText(value);
    const items = this.extractList(cleaned);

    return {
      summary: cleaned,
      content: items.length > 1 ? '' : cleaned,
      items: items.length > 1 ? items : []
    };
  }

  extractList(value: string) {
    if (!value) {
      return [];
    }

    const lineSplit = value
      .split(/\r?\n+/)
      .map((item) => item.replace(/^[-*•\d.\s]+/, '').trim())
      .filter(Boolean);

    if (lineSplit.length > 1) {
      return lineSplit;
    }

    const commaSplit = value
      .split(/,\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 2);

    return commaSplit.length > 2 ? commaSplit : [];
  }

  cleanText(value: any) {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  getNestedValue(source: any, path: string) {
    return path.split('.').reduce((acc, key) => acc?.[key], source);
  }

  getReviewRating(review: any) {
    const value = Number(
      review?.rating ??
      review?.avg_rating ??
      this.getNestedValue(review, 'rating.value') ??
      0
    );

    return Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
  }

  getReviewTitle(review: any) {
    return this.cleanText(
      review?.title ??
      review?.headline ??
      review?.review_title ??
      ''
    );
  }

  getReviewDescription(review: any) {
    return this.cleanText(
      review?.description ??
      review?.comment ??
      review?.review ??
      review?.review_text ??
      review?.content ??
      review?.body ??
      review?.text ??
      'No written review provided.'
    );
  }

  isReviewExpanded(index: number) {
    return this.expandedReviews.has(index);
  }

  toggleReviewExpanded(index: number) {
    if (this.isReviewExpanded(index)) {
      this.expandedReviews.delete(index);
      return;
    }

    this.expandedReviews.add(index);
  }

  shouldShowReviewToggle(review: any) {
    return this.getReviewDescription(review).length > this.reviewPreviewCharacterLimit;
  }

  getReviewAuthor(review: any) {
    return this.cleanText(
      review?.reviewer_name ??
      review?.userName ??
      review?.user_name ??
      review?.customer_name ??
      review?.name ??
      this.getNestedValue(review, 'user.name') ??
      'Verified Customer'
    );
  }

  isVerifiedReview(review: any) {
    return Boolean(
      review?.isVerifiedBuyer ??
      review?.is_verified_buyer ??
      review?.is_verified ??
      review?.verified
    );
  }

  getReviewLocation(review: any) {
    return this.cleanText(
      review?.from ??
      review?.location ??
      review?.city ??
      review?.reviewer_city ??
      ''
    );
  }

  getReviewDateLabel(review: any) {
    const rawValue =
      review?.review_date ??
      review?.date ??
      review?.created_at ??
      review?.createdAt;

    if (!rawValue) {
      return '';
    }

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
      return this.cleanText(rawValue);
    }

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getReviewImages(review: any) {
    const sourceImages = review?.images;

    if (!Array.isArray(sourceImages)) {
      return [];
    }

    return sourceImages
      .map((image: any) => {
        if (typeof image === 'string') {
          return image;
        }

        return image?.image ?? image?.url ?? image?.src ?? '';
      })
      .filter((image: string) => Boolean(image));
  }

  get activeProductInfoSection() {
    return this.productInfoSections.find((section) => section.key === this.activeProductInfoKey) || this.productInfoSections[0];
  }

  setActiveProductInfo(key: string) {
    this.activeProductInfoKey = this.activeProductInfoKey === key ? '' : key;
  }

  isScrolled = false;
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.scrollY;  // Get the vertical scroll position
    if (scrollPosition > 360) {
      this.isScrolled = true;
    } else {
      this.isScrolled = false;
    }
  }

  visible = false;
  drawerPlacement: any = 'right'
  locationPincode = '638301';
  locationCity = 'Chennai';
  locationError = '';

  @HostListener('window:resize')
  onWindowResize() {
    this.updateDrawerPlacement();
  }

  ngAfterViewInit() {
    this.updateDrawerPlacement();
  }

  open(): void {
    this.updateDrawerPlacement();
    this.visible = true;
  }

  close(): void {
    this.visible = false;
    this.locationError = '';
  }

  onPincodeInput(event?: Event) {
    const input = event?.target as HTMLInputElement | undefined;
    const normalized = (input?.value ?? this.locationPincode).replace(/\D/g, '').slice(0, 6);
    this.locationPincode = normalized;
    if (input && input.value !== normalized) {
      input.value = normalized;
    }
    if (this.locationError) {
      this.locationError = '';
    }
  }

  checkLocation() {
    if (this.locationPincode.length !== 6) {
      this.locationError = 'Enter a valid 6-digit pincode.';
      return;
    }

    this.locationError = '';
    this.locationCity = this.locationPincode === '638301' ? 'Chennai' : 'Serviceable area';
  }

  useCurrentLocation() {
    this.locationPincode = '638301';
    this.locationCity = 'Chennai';
    this.locationError = '';
  }

  confirmLocation() {
    this.checkLocation();
    if (this.locationError) {
      return;
    }

    this.message.success(`Delivery location updated to ${this.locationCity}.`);
    this.close();
  }

  private updateDrawerPlacement() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.drawerPlacement = window.innerWidth < 768 ? 'bottom' : 'right';
  }

  private getSelectedDetail() {
    return this.productDetailsMain?.find((item: any) => item.id == this.selectedGramId) ?? this.currentPriceData ?? null;
  }

  private getSelectedProductForCart() {
    const selectedDetail = this.getSelectedDetail();
    if (!selectedDetail) {
      return null;
    }

    return {
      ...this.productData,
      details: [selectedDetail]
    };
  }

  slugify(value: string): string {
    const normalizedValue = typeof value === 'string' ? value : String(value ?? '');

    return normalizedValue
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

}
