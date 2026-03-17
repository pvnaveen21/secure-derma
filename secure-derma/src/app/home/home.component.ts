import { Component, inject, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Assets } from '../shared/assets';
import { Icons } from '../shared/icons';
import { HomeService } from '../services/home.service';
import { CartService } from '../services/cart.service';
import { HorizontalScrollComponent } from '../shared/horizontal-scroll/horizontal-scroll.component';

@Component({
  selector: 'app-home',
  imports: [
    NzCarouselModule,
    CommonModule,
    LucideAngularModule,
    NzInputModule,
    HorizontalScrollComponent,
    NzRateModule,
    FormsModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  assets = Assets
  icons = Icons
  isBrowser:any = false
  main_image_url:any=''
  constructor(
    private homeService: HomeService,
    private router: Router,
    private cartService: CartService,
    private message: NzMessageService,
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document
  ) {
    const platformIds:any = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformIds);
   }

  ngOnInit() {
    this.getTopBrandsList()
    this.getShowCategoryList()
    this.getBannerImage()
    this.getTrendingProduct()
    this.getMainBannerImage('main_image')
    this.getWhySecureDermaImage('why_secure_derma')
    this.loadConcernProducts(this.selectedConcern)
  }
  trendingProductList: any = []
  why_secure_derma:any=''

  getMainBannerImage(type:any){
    this.homeService.getImageByType(type).subscribe({
      next: (res: any) => {
        console.log(res);
        if (res?.images){
        this.main_image_url = res?.images[0].image
        }
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
      }
    });
  }
  getWhySecureDermaImage(type: any) {
    this.homeService.getImageByType(type).subscribe({
      next: (res: any) => {
        console.log(res);
        if (res?.images) {
          this.why_secure_derma = res?.images[0].image
        }
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
      }
    });
  }
  getTrendingProduct() {
    this.homeService.getTrendingProductList().subscribe({
      next: (res: any) => {
        this.trendingProductList = res.trending_products
        console.log(this.trendingProductList);
        
        // this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
      }
    });
  }
  topBrandsList: any = []

  getTopBrandsList() {
    this.homeService.getTopBrandsList().subscribe({
      next: (res: any) => {
        this.topBrandsList = res.top_brands
        // this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
      }
    });
  }
  bannerImages: any = []
  getBannerImage() {
    this.homeService.getBannerImages().subscribe({
      next: (res: any) => {
        this.bannerImages = res.landing_page_images

        // this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
      }
    });
  }
  categoryList: any = []
  getShowCategoryList() {
    this.homeService.getHomeCategoryList().subscribe({
      next: (res: any) => {
        this.categoryList = res.home_product_types

        // this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching brands:', err);
      }
    });
  }

  concernList = [
    'Acne',
    'Pigmentation',
    'Hair Fall',
    'Dandruff',
    'Sensitive Skin',
    'Dryness',
    'Sun Protection',
    'Anti Ageing'
  ]
  selectedConcern = 'Acne'
  concernProducts: any[] = []
  concernProductsLoading = false
  concernTotalCount = 0
  recentlyAddedProductId: number | null = null
  private addToCartFeedbackTimeout?: ReturnType<typeof setTimeout>

  loadConcernProducts(concern: string) {
    this.selectedConcern = concern
    this.concernProductsLoading = true
    this.homeService.getProductsByConcern(concern.toLocaleLowerCase(), 10).subscribe({
      next: (res: any) => {
        this.concernProducts = res?.products || []
        this.concernTotalCount = Number(res?.total_count || 0)
        this.concernProductsLoading = false
      },
      error: () => {
        this.concernProducts = []
        this.concernTotalCount = 0
        this.concernProductsLoading = false
      }
    })
  }

  viewAllConcernProducts() {
    this.producetNavigation(this.selectedConcern);
  }

  routineForm = {
    skinType: 'Oily',
    concern: 'Acne',
    budget: 'medium'
  }
  routineLoading = false
  routineResult: any = null

  submitRoutineBuilder() {
    this.routineLoading = true
    this.routineResult = null
    this.homeService.buildRoutine({
      skin_type: this.routineForm.skinType,
      concern: this.routineForm.concern,
      budget: this.routineForm.budget
    }).subscribe({
      next: (res: any) => {
        this.routineResult = res?.routine || null
        this.routineLoading = false
      },
      error: () => {
        this.routineResult = null
        this.routineLoading = false
      }
    })
  }


  array = [
    { image: this.assets.secura.banner2 },
    { image: this.assets.secura.banner1 },
    { image: this.assets.secura.banner3 }
  ];
  brands: any = [
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },
    { logo: this.assets.secura.banner2 },


  ]

  metrics = [
    { value: 150, display: '150+', label: 'Dermatologist Partner Brands' },
    { value: 8000, display: '8,000+', label: 'Verified Product SKUs' },
    { value: 24, display: '24h', label: 'Avg Dispatch Window' },
    { value: 72, display: '72%', label: 'Repeat Purchase Share' }
  ];

  categories = [
    {
      name: 'Facewash',
      image: this.assets.secura.banner1
    },
    {
      name: 'Serum',
      image: this.assets.secura.banner1
    },
    {
      name: 'Moisturiser',
      image: this.assets.secura.banner1
    },
    {
      name: 'Sunscreen',
      image: this.assets.secura.banner1
    },
    {
      name: 'Hair Care',
      image: this.assets.secura.banner1
    },
    {
      name: 'Supplements',
      image: this.assets.secura.banner1
    }
  ];

  testimonialsData = [
    { name: 'Neha R.', initial: 'N', tag: 'Acne Care', text: 'Started with a simple routine from Secure Derma and my active acne reduced steadily without irritation.', concern: 'Adult Acne', result: 'Calmer Skin in 4 Weeks' },
    { name: 'Arjun P.', initial: 'A', tag: 'Hair Routine', text: 'I liked how easy it was to find products for hair fall. Results are visible and my scalp feels healthier.', concern: 'Hair Fall', result: 'Better Density in 6 Weeks' },
    { name: 'Sara K.', initial: 'S', tag: 'Sensitive Skin', text: 'Ingredient clarity helped me avoid triggers. Redness dropped and my skin barrier feels much stronger now.', concern: 'Barrier Damage', result: 'Reduced Redness in 3 Weeks' },
    { name: 'Ritika M.', initial: 'R', tag: 'Pigmentation', text: 'My dark spots are lighter and texture looks smoother. The routine suggestions were practical and easy.', concern: 'Uneven Tone', result: 'Visible Brightening in 5 Weeks' },
    { name: 'Vikram D.', initial: 'V', tag: 'Sun Care', text: 'The sunscreens here feel light and comfortable. Reapplication is easy with no heavy finish.', concern: 'UV Protection', result: 'Comfortable Daily Use' },
    { name: 'Priya J.', initial: 'P', tag: 'Pediatric', text: 'The pediatric section was clear and helpful. My child\'s dry patches improved with gentle products.', concern: 'Dry Patches', result: 'Softer Skin in 10 Days' },
    { name: 'Karan S.', initial: 'K', tag: 'Oil Control', text: 'My T-zone shine is under control and I do not get frequent midday breakouts anymore.', concern: 'Oily Skin', result: 'Balanced Skin in 3 Weeks' },
    { name: 'Aditi G.', initial: 'A', tag: 'Barrier Repair', text: 'I over-exfoliated before. This routine helped me rebuild my skin barrier without guesswork.', concern: 'Compromised Barrier', result: 'Comfort Restored in 2 Weeks' },
    { name: 'Manoj T.', initial: 'M', tag: 'Beard Care', text: 'Got better guidance than generic marketplaces. Irritation under beard area has reduced a lot.', concern: 'Beard Irritation', result: 'Less Itching in 12 Days' },
    { name: 'Ishita L.', initial: 'I', tag: 'Hydration', text: 'My skin stopped feeling tight by evening. Products are authentic and delivery was quick.', concern: 'Dehydration', result: 'All-day Hydration' },
    { name: 'Rohan B.', initial: 'R', tag: 'Anti Dandruff', text: 'The anti-dandruff combo worked better than my old routine and did not dry my scalp.', concern: 'Flaky Scalp', result: 'Cleaner Scalp in 3 Weeks' },
    { name: 'Meera N.', initial: 'M', tag: 'Night Repair', text: 'Simple PM routine, strong results. Skin feels fresher in the morning and less dull overall.', concern: 'Dullness', result: 'Brighter Look in 4 Weeks' },
    { name: 'Yash C.', initial: 'Y', tag: 'Beginner Friendly', text: 'As a beginner, I liked the category and concern filters. It made product selection straightforward.', concern: 'Routine Confusion', result: 'Clear Routine Setup' },
    { name: 'Pooja W.', initial: 'P', tag: 'Body Care', text: 'Found targeted body care products that actually improved roughness on arms and elbows.', concern: 'Body Roughness', result: 'Smoother Texture in 3 Weeks' },
    { name: 'Dev R.', initial: 'D', tag: 'Post Workout', text: 'I needed sweat-friendly skincare. The products here helped prevent post-workout congestion.', concern: 'Clogged Pores', result: 'Fewer Breakouts' },
    { name: 'Tanvi H.', initial: 'T', tag: 'Eye Care', text: 'Eye-area dryness improved significantly and makeup sits better now.', concern: 'Under-eye Dryness', result: 'Softer Under-eye in 2 Weeks' },
    { name: 'Nitin A.', initial: 'N', tag: 'Men\'s Skin', text: 'I built a solid routine quickly and skin feels less rough after shaving.', concern: 'Post-shave Sensitivity', result: 'Comfortable Skin in 2 Weeks' },
    { name: 'Lavanya P.', initial: 'L', tag: 'Glow Care', text: 'The glow range recommendations were great. My skin tone looks fresher and healthier.', concern: 'Tired Looking Skin', result: 'Healthier Glow in 4 Weeks' },
    { name: 'Harsh I.', initial: 'H', tag: 'Combo Skin', text: 'Finally found products that work for both oily and dry zones without imbalance.', concern: 'Combination Skin', result: 'Balanced Feel in 3 Weeks' },
    { name: 'Sonal V.', initial: 'S', tag: 'Repair Focus', text: 'The ingredient-first approach gave me confidence. No random buying anymore.', concern: 'Routine Overload', result: 'Smarter Product Choices' },
    { name: 'Aman K.', initial: 'A', tag: 'Daily Essentials', text: 'Reliable products, fair pricing, and quick shipping. My daily routine is now consistent.', concern: 'Consistency', result: 'Routine Maintained Daily' }
  ];

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return; // 👈 SSR exit safely
    }
    // this.animateCount(0, '%');
    // this.animateCount(1, '');

    const elements = this.document.querySelectorAll('.scroll-animate');

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
          }
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach(el => observer.observe(el));
  }

  handleError(error: any) {
    if (isPlatformBrowser(this.platformId) && error instanceof ErrorEvent) {
      console.error('Browser Error:', error.message);
    } else {
      console.error('Server Error:', error);
    }
  }
  animateCount(index: number, suffix: string) {
    let start = 0;
    const end = this.metrics[index].value;
    const interval = setInterval(() => {
      start++;
      this.metrics[index].display = start + suffix;
      if (start >= end) clearInterval(interval);
    }, 25);
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
  producetNavigation(value: any) {
    this.router.navigate([`./collections/${this.slugify(value)}`], {
      state: {
        scrollToTop: true
      }
    })
  }

  producetView(product: any) {
    const productSlug = product?.slug || product?.product_slug || this.slugify(product?.product_name || '');
    if (!productSlug) {
      return;
    }

    this.router.navigate([`./products/${productSlug}`]);
    
  }

  async addToCart(product: any) {
    try {
      const result = await this.cartService.addToCart(this.normalizeProductForCart(product));

      switch (result.status) {
        case 'added':
        case 'updated':
          this.recentlyAddedProductId = product.id;
          if (this.addToCartFeedbackTimeout) {
            clearTimeout(this.addToCartFeedbackTimeout);
          }
          this.addToCartFeedbackTimeout = setTimeout(() => {
            if (this.recentlyAddedProductId === product.id) {
              this.recentlyAddedProductId = null;
            }
          }, 2200);
          this.message.success(
            result.status === 'added'
              ? `${product.product_name} added to cart`
              : `${product.product_name} quantity updated in cart`
          );
          break;
        case 'limit_reached':
          this.message.info(`${product.product_name} is already at the maximum quantity`);
          break;
        case 'missing_details':
          this.message.error(`Unable to add ${product.product_name} right now`);
          break;
      }
    } catch {
      this.message.error(`Unable to add ${product.product_name} right now`);
    }
  }

  ngOnDestroy() {
    if (this.addToCartFeedbackTimeout) {
      clearTimeout(this.addToCartFeedbackTimeout);
    }
  }

  private normalizeProductForCart(product: any) {
    const selectedDetail =
      product?.details?.[0]
      ?? product?.product_details?.[0]
      ?? (product?.price || product?.min_price
        ? {
            id: product?.detail_id ?? product?.id,
            selling_price: Number(product?.price ?? product?.min_price ?? 0),
            original_price: Number(
              product?.original_price
              ?? product?.product_details?.[0]?.original_price
              ?? product?.price
              ?? product?.min_price
              ?? 0
            ),
            discount_price: Number(
              product?.discount_price
              ?? product?.product_details?.[0]?.discount_price
              ?? 0
            )
          }
        : null);

    return {
      ...product,
      details: selectedDetail ? [selectedDetail] : []
    };
  }

}
