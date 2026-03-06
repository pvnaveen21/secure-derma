import { ChangeDetectorRef, Component, inject, Inject, PLATFORM_ID } from '@angular/core';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { Router } from '@angular/router';
import { Assets } from '../shared/assets';
import { Icons } from '../shared/icons';
import { HomeService } from '../services/home.service';
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
    { value: 98, display: '100%', label: 'PURITY VERIFIED' },
    { value: 5, display: '5', label: 'STEP SAFETY TESTING' },
    { value: 7, display: 'pH', label: 'BALANCED FORMULAS' },
    { value: 1, display: 'Direct', label: 'BRAND SOURCED' }
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
    this.router.navigate([`./collections/${this.slugify(value)}`])
  }

  producetView(value:any){
    this.router.navigate([`./products/${this.slugify(value)}`]);
    
  }

}
