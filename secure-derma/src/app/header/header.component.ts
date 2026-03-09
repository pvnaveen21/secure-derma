import { ChangeDetectorRef, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NzDropDownDirective, NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { FormsModule } from '@angular/forms';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { CommonModule, NgClass } from '@angular/common';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { Subject, Subscription, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { HeaderService } from '../services/header.service';
import { Assets } from '../shared/assets';
import { Icons } from '../shared/icons';
import { CartItem, CartService } from '../services/cart.service';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { SettingsService } from '../services/settings/settings.service';
interface MobilePanelItem {
  label: string;
  value: string;
  type: 'skin' | 'hair' | 'supplements';
}

interface Panel {
  key: string;
  name: string;
  active: boolean;
  disabled: boolean;
  image: string;
  categoryTitle: string;
  concernTitle: string;
  categoryItems: MobilePanelItem[];
  concernItems: MobilePanelItem[];
  routeValue: string;
  routeType: 'skin' | 'hair' | 'supplements';
}
@Component({
  selector: 'app-header',
  imports: [
    NzDropDownModule,
    NzInputModule,
    LucideAngularModule,
    NzBadgeModule,
    NzDividerModule,
    NzDrawerModule,
    FormsModule, // Make sure FormsModule is imported for ngModel
    NgClass,
    CommonModule,
    NzCarouselModule,
    NzEmptyModule,
    NzButtonModule,
    NzInputNumberModule,
    NzIconModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly mobileBreakpoint = 768;
  @ViewChild('brandListContainer') brandListContainer!: ElementRef;
  @ViewChild('mobileBrandListContainer') mobileBrandListContainer?: ElementRef;
  @ViewChild(NzDropDownDirective) dropdown!: NzDropDownDirective;
  // Add a search property for two-way binding
  searchTerm: string = '';

  isDropdownVisible: any = true;
  assets = Assets;
  icons = Icons;
  cartCount: any = 3;
  alphabet: any = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  activeLetter = '';
  selectedSideType: any = 1;
  cartDrawerVisible: any = false
  cartDrawerPlacement: any = 'right'
  array = [{ image: this.assets.secura.banner1 }, { image: this.assets.secura.banner2 }, { image: this.assets.secura.banner3 }];

  panels: Panel[] = [];
  mobileQuickLinks = [
    { name: 'Pediatric', value: 'pediatric' },
    { name: 'Shop All', value: 'all' }
  ];

  // Add these properties
  isSkinDropdownVisible = false;
  isHairDropdownVisible = false;
  isSupplementDropdownVisible = false;
  isBrandDropdownVisible: any = false

  // Search-related properties
  private searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  allBrands: any = {};
  allBrandKey: any[] = [];
  loading: boolean = false;

  drawerReady = true;
  visible = false;

  constructor(
    private router: Router,
    private headerService: HeaderService,
    private cdr: ChangeDetectorRef,
    private settingsService: SettingsService
  ) {
    // Initialize the search subscription
    this.searchSub = this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe((searchTerm: string) => {
        this.performBrandSearch(searchTerm);
      });
  }

  private cartService: any = inject(CartService);

  cartQuantity$ = this.cartService.cart$.pipe(
    map((items: any) => items.reduce((sum: any, i: any) => sum + i.quantity, 0))
  );
  private subscription!: Subscription;
  cartItems: CartItem[] = [];
  ngOnInit() {
    this.initializePanels();
    this.getBrandsList();
    this.getSkinBannerList()
    this.getHairBannerList()
    this.getSupplementBannerList()

    this.subscription = this.cartService.cart$.subscribe((items: any) => {
      this.cartItems = items;
    });
  }

  updateQuantity(productId: number, change: number): void {
    this.cartService.updateQuantity(productId, change);
  }

  removeItem(productId: number): void {
    this.cartService.removeItem(productId);
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get shipping(): number {
    return 0; // Free shipping
  }

  get total(): number {
    return this.subtotal + this.shipping;
  }

  get totalItems(): number {
    return this.cartService.totalQuantity;
  }

  proceedToCheckout(): void {
    // Navigate to checkout page
    console.log('Proceeding to checkout with items:', this.cartItems);
    // this.router.navigate(['/checkout']);
  }



  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
    this.searchSubject.complete();
  }

  // Update search handler
  onSearchChange(value: any) {
    this.searchTerm = value;
    this.searchSubject.next(value.trim()); // Trim whitespace
  }

  // Perform the actual search
  private performBrandSearch(searchTerm: string) {
    if (!searchTerm || searchTerm.length === 0) {
      // If search term is empty, show all brands
      this.getBrandsList();
      return;
    }

    this.loading = true;
    this.headerService.searchBrands(searchTerm).subscribe({
      next: (res) => {
        this.allBrands = res;
        this.allBrandKey = Object.keys(this.allBrands || {});
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Search error:', err);
        this.loading = false;
        // Optionally show an error message
      }
    });
  }
  onVisibleChange(status: boolean) {
    if (!status && this.searchTerm.length != 0) {
      this.searchTerm = ''
      this.getBrandsList();
    }

  }
  getBrandsList() {
    this.loading = true;
    this.headerService.getBrandsList().subscribe({
      next: (res) => {
        this.allBrands = res;
        this.allBrandKey = Object.keys(this.allBrands || {});
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
        this.loading = false;
      }
    });
  }
  hairBannerData: any = []
  getHairBannerList() {
    this.headerService.getHairBannerList().subscribe({
      next: (res) => {
        this.hairBannerData = res
        this.syncPanelData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
        this.loading = false;
      }
    });
  }

  supplementBannerData: any = []
  getSupplementBannerList() {
    this.headerService.getSupplementBannerList().subscribe({
      next: (res) => {
        this.supplementBannerData = res
        this.syncPanelData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
        this.loading = false;
      }
    });
  }

  skinBannerData: any = []
  getSkinBannerList() {
    this.headerService.getSkinBannerList().subscribe({
      next: (res) => {
        this.skinBannerData = res
        this.syncPanelData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
        this.loading = false;
      }
    });
  }


  getBrandKeys(brands: any): string[] {
    return Object.keys(brands || {}).sort();
  }

  scrollToLetter(letter: string) {
    this.activeLetter = letter;
    const container = this.brandListContainer.nativeElement;
    const section = container.querySelector(`[data-letter="${letter}"]`);

    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  mobileSidescrollToLetter(letter: string) {
    const container = this.mobileBrandListContainer?.nativeElement;
    if (!container) {
      return;
    }

    const targetSection = container.querySelector(`[data-letter="${letter}"]`);
    if (!targetSection) {
      return;
    }

    this.activeLetter = letter;
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  sideMenuView(type: any) {
    this.selectedSideType = type;
  }

  // Dropdown methods
  closeSkinDropdown() {
    this.isSkinDropdownVisible = false;
  }

  keepSkinDropdownOpen() {
    this.isSkinDropdownVisible = true;
  }

  closeHairDropdown() {
    this.isHairDropdownVisible = false;
  }

  keepHairDropdownOpen() {
    this.isHairDropdownVisible = true;
  }

  closeSupplementDropdown() {
    this.isSupplementDropdownVisible = false;
  }

  keepSupplementDropdownOpen() {
    this.isSupplementDropdownVisible = true;
  }
  closeBrandDropdown() {
    if (this.searchTerm.length != 0) {
      setTimeout(() => {
        this.searchTerm = ''
        this.getBrandsList();
      }, 1800)
    }
    this.isBrandDropdownVisible = false;

  }

  keepBrandDropdownOpen() {
    this.isBrandDropdownVisible = true;
  }
  togglePanel(panel: Panel): void {
    this.panels = this.panels.map((entry) => ({
      ...entry,
      active: entry.key === panel.key ? !entry.active : false
    }));
  }

  ngAfterViewInit() {
    this.drawerReady = true;
  }

  openSideMenu() {
    if (this.isDesktopView()) {
      this.visible = false;
      return;
    }
    this.visible = true;
    this.selectedSideType = 1;
  }

  closeSideMenu() {
    this.visible = false;
  }

  @HostListener('window:resize')
  onViewportResize() {
    if (this.isDesktopView() && this.visible) {
      this.closeSideMenu();
    }
  }

  homeLocation() {
    this.router.navigate(['./'])
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
  producetNavigation(value: any, type?: any) {
    if (type == 'all') {
      this.closeBrandDropdown()
    }
    if (type == 'skin') {
      this.closeSkinDropdown()
    }
    else if (type == 'hair') {
      this.closeHairDropdown()
    }
    else if (type == 'supplements') {
      this.closeSupplementDropdown()
    }
    this.router.navigate([`./collections/${this.slugify(value)}`])
  }
  openCartDrawer() {
    this.cartDrawerVisible = true
  }
  closeCartDrawer() {
    this.cartDrawerVisible = false;
  }
  signIn() {
    this.router.navigate(['account/login'])
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/placeholder.png'; // Add a placeholder image
    // Or use a data URL for inline placeholder
    imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e0" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpolyline points="21 15 16 10 5 21"/%3E%3C/svg%3E';
  }

  onQuantityChange(item: CartItem, newQuantity: number): void {
    const change = newQuantity - item.quantity;
    this.cartService.updateQuantity(item.productId, change);
  }

  getDiscountPercent(item: CartItem): number {
    if (item.discountPrice && item.discountPrice > 0) {
      return item.discountPrice;
    }

    if (!item.originalPrice || item.originalPrice <= item.price) {
      return 0;
    }

    return Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
  }

  startShop() {
    this.closeCartDrawer();
    this.router.navigate(['collections/all'])
  }

  get isDark(): boolean {
    return this.settingsService.isDarkTheme();
  }

  toggleTheme(): void {
    this.settingsService.toggleLightDark();
  }

  private isDesktopView(): boolean {
    return typeof window !== 'undefined' && window.innerWidth > this.mobileBreakpoint;
  }

  getMobilePanelTitle(panelKey: string): string {
    if (panelKey === 'skin') {
      return 'Start with your concern, finish with a complete routine.';
    }
    if (panelKey === 'hair') {
      return 'Choose products by scalp need and hair type.';
    }
    return 'Daily support tailored to your routine.';
  }

  private initializePanels() {
    this.panels = [
      {
        key: 'skin',
        name: 'Skin',
        active: false,
        disabled: false,
        image: '',
        categoryTitle: 'BY CATEGORY',
        concernTitle: 'BY CONCERN',
        categoryItems: [],
        concernItems: [],
        routeValue: 'skin-care',
        routeType: 'skin'
      },
      {
        key: 'hair',
        name: 'Hair',
        active: false,
        disabled: false,
        image: '',
        categoryTitle: 'BY CATEGORY',
        concernTitle: 'BY CONCERN',
        categoryItems: [],
        concernItems: [],
        routeValue: 'hair-care',
        routeType: 'hair'
      },
      {
        key: 'supplements',
        name: 'Supplement',
        active: false,
        disabled: false,
        image: '',
        categoryTitle: 'SHOP BY TYPE',
        concernTitle: 'BY CONCERN',
        categoryItems: [],
        concernItems: [],
        routeValue: 'supplements',
        routeType: 'supplements'
      }
    ];
  }

  private syncPanelData() {
    this.panels = this.panels.map((panel) => {
      if (panel.key === 'skin') {
        return {
          ...panel,
          image: this.skinBannerData?.skin_info?.image || this.assets.secura.skin,
          categoryItems: this.mapPanelItems(this.skinBannerData?.skin_category?.data, 'product_type', 'skin'),
          concernItems: this.mapPanelItems(this.skinBannerData?.skin_concerns?.data, 'skin_concern', 'skin')
        };
      }
      if (panel.key === 'hair') {
        return {
          ...panel,
          image: this.hairBannerData?.hair_info?.image || this.assets.secura.skin,
          categoryItems: this.mapPanelItems(this.hairBannerData?.hair_category?.data, 'product_type', 'hair'),
          concernItems: this.mapPanelItems(this.hairBannerData?.hair_concerns?.data, 'hair_concern', 'hair')
        };
      }

      return {
        ...panel,
        image: this.supplementBannerData?.category_info?.image || this.assets.secura.skin,
        categoryItems: this.mapPanelItems(this.supplementBannerData?.supplements?.data, 'product_type', 'supplements'),
        concernItems: []
      };
    });
  }

  private mapPanelItems(data: any[] | undefined, field: string, type: 'skin' | 'hair' | 'supplements'): MobilePanelItem[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((entry) => {
        const label = entry?.[field];
        if (!label) {
          return null;
        }
        return {
          label,
          value: label,
          type
        };
      })
      .filter((entry): entry is MobilePanelItem => !!entry);
  }

}
