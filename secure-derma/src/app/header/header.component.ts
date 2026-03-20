import { ChangeDetectorRef, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NzDropDownDirective, NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { LucideAngularModule } from 'lucide-angular';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
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
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SettingsService } from '../services/settings/settings.service';
import { PaymentService } from '../services/payment.service';
import { AuthService } from '../services/auth/auth.service';
import { ThemeType } from '../interfaces/theme';
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

interface SearchSuggestionItem {
  label: string;
  subtitle?: string;
  type: 'product' | 'brand' | 'category' | 'related';
  routeValue: string;
  routeType?: 'all' | 'skin' | 'hair' | 'supplements' | 'product';
  image?: string | null;
  price?: number | null;
  originalPrice?: number | null;
}

interface SearchSuggestionGroup {
  title: string;
  type: SearchSuggestionItem['type'];
  items: SearchSuggestionItem[];
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
    NzMenuModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly mobileBreakpoint = 768;
  private readonly resumeCheckoutStorageKey = 'secure_derma_resume_checkout';
  @ViewChild('brandListContainer') brandListContainer!: ElementRef;
  @ViewChild('mobileBrandListContainer') mobileBrandListContainer?: ElementRef;
  @ViewChild('desktopSearchShell') desktopSearchShell?: ElementRef;
  @ViewChild('mobileSearchShell') mobileSearchShell?: ElementRef;
  @ViewChild(NzDropDownDirective) dropdown!: NzDropDownDirective;
  // Add a search property for two-way binding
  searchTerm: string = '';
  globalSearchTerm = '';

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
  private globalSearchSubject = new Subject<string>();
  private globalSearchSub!: Subscription;

  allBrands: any = {};
  allBrandKey: any[] = [];
  allBrandEntries: Array<{ id?: number; brand_name: string; brand_image?: string }> = [];
  loading: boolean = false;
  suggestionLoading = false;
  showSearchSuggestions = false;
  searchSuggestionGroups: SearchSuggestionGroup[] = [];
  isHeaderSearchFocused = false;
  isSelectionLoading = false;
  pendingSelectionLabel = '';
  private selectionLoaderStartedAt = 0;
  private selectionLoaderTimeout?: ReturnType<typeof setTimeout>;

  drawerReady = true;
  visible = false;
  checkoutLoading = false;

  constructor(
    private router: Router,
    private headerService: HeaderService,
    private cdr: ChangeDetectorRef,
    private settingsService: SettingsService,
    private paymentService: PaymentService,
    private message: NzMessageService,
    private authService: AuthService
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

    this.globalSearchSub = this.globalSearchSubject
      .pipe(
        debounceTime(220),
        distinctUntilChanged()
      )
      .subscribe((searchTerm: string) => {
        this.performHeaderSearch(searchTerm);
      });
  }

  private cartService: any = inject(CartService);

  cartQuantity$ = this.cartService.cart$.pipe(
    map((items: any) => items.reduce((sum: any, i: any) => sum + i.quantity, 0))
  );
  private subscription!: Subscription;
  private routerEventsSubscription?: Subscription;
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

    this.routerEventsSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart && event.url.includes('/collections/')) {
        this.showSelectionLoader();
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.hideSelectionLoader();
      }
    });

    if (typeof window !== 'undefined' && localStorage.getItem(this.resumeCheckoutStorageKey) === '1') {
      localStorage.removeItem(this.resumeCheckoutStorageKey);
      this.router.navigate(['/checkout']);
    }
  }

  updateQuantity(itemKey: number, change: number): void {
    void this.cartService.updateQuantity(itemKey, change).catch(() => {
      this.message.error('Unable to update cart right now.');
    });
  }

  removeItem(itemKey: number): void {
    void this.cartService.removeItem(itemKey).catch(() => {
      this.message.error('Unable to remove this item right now.');
    });
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get originalSubtotal(): number {
    return this.cartItems.reduce((sum, item) => {
      const originalPrice = item.originalPrice ?? item.price;
      return sum + (originalPrice * item.quantity);
    }, 0);
  }

  get totalSavings(): number {
    return this.cartItems.reduce((sum, item) => {
      const originalPrice = item.originalPrice ?? item.price;
      if (!originalPrice || originalPrice <= item.price) {
        return sum;
      }

      return sum + ((originalPrice - item.price) * item.quantity);
    }, 0);
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

  get isLoggedIn(): boolean {
    return !!this.authService.isLoggedIn();
  }

  get hasBrandResults(): boolean {
    return Object.keys(this.allBrands || {}).length > 0;
  }

  logout(): void {
    this.authService.logout();
  }

  openMyAccount(): void {
    void this.router.navigate(['/account']);
  }

  proceedToCheckout(): void {
    if (!this.cartItems.length) {
      this.message.warning('Your cart is empty.');
      return;
    }

    this.paymentService.saveCheckoutSession({
      source: 'cart',
      items: this.cartItems
        .filter((item) => item.detailId)
        .map((item) => ({
          productId: item.productId,
          detailId: item.detailId,
          quantity: item.quantity,
          productName: item.productName,
          thumbnail: item.thumbnail,
          productWeight: item.productWeight,
          weightType: item.weightType,
          qualityLabel: item.qualityLabel,
          unitPrice: item.price,
          originalPrice: item.originalPrice,
          lineTotal: item.lineTotal || item.price * item.quantity,
        }))
    });

    if (!this.authService.isLoggedIn()) {
      this.message.warning('Please login to continue checkout.');
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.resumeCheckoutStorageKey, '1');
      }
      this.authService.redirectUrl = '/checkout';
      this.closeCartDrawer();
      this.router.navigate(['/account/login']);
      return;
    }

    this.closeCartDrawer();
    this.router.navigate(['/checkout']);
  }



  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
    if (this.globalSearchSub) {
      this.globalSearchSub.unsubscribe();
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.routerEventsSubscription) {
      this.routerEventsSubscription.unsubscribe();
    }
    if (this.selectionLoaderTimeout) {
      clearTimeout(this.selectionLoaderTimeout);
    }
    this.searchSubject.complete();
  }

  // Update search handler
  onSearchChange(value: any) {
    this.searchTerm = value;
    this.searchSubject.next(value.trim()); // Trim whitespace
  }

  onGlobalSearchChange(value: string) {
    this.globalSearchTerm = value;
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      this.showSearchSuggestions = false;
      this.suggestionLoading = false;
      this.searchSuggestionGroups = [];
      return;
    }

    this.showSearchSuggestions = true;
    this.suggestionLoading = true;
    this.globalSearchSubject.next(trimmedValue);
  }

  onGlobalSearchFocus() {
    this.isHeaderSearchFocused = true;
    if (this.globalSearchTerm.trim()) {
      this.showSearchSuggestions = true;
    }
  }

  clearGlobalSearch() {
    this.globalSearchTerm = '';
    this.showSearchSuggestions = false;
    this.suggestionLoading = false;
    this.searchSuggestionGroups = [];
    this.isHeaderSearchFocused = false;
  }

  closeSearchSuggestions() {
    this.showSearchSuggestions = false;
  }

  submitGlobalSearch() {
    const firstSuggestion = this.searchSuggestionGroups
      .flatMap((group) => group.items)[0];

    if (firstSuggestion) {
      this.navigateToSuggestion(firstSuggestion);
      return;
    }

    if (this.globalSearchTerm.trim()) {
      const searchValue = this.globalSearchTerm.trim();
      this.clearGlobalSearch();
      this.producetNavigation(searchValue, 'all');
    }
  }

  navigateToSuggestion(suggestion: SearchSuggestionItem) {
    this.clearGlobalSearch();

    if (suggestion.routeType === 'product') {
      const productSlug = suggestion.routeValue || this.slugify(suggestion.label);
      if (!productSlug) {
        return;
      }
      this.router.navigate([`./products/${productSlug}`]);
      return;
    }

    this.producetNavigation(suggestion.routeValue, suggestion.routeType ?? 'all');
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

  private performHeaderSearch(searchTerm: string) {
    if (!searchTerm) {
      this.suggestionLoading = false;
      this.searchSuggestionGroups = [];
      return;
    }

    const query = searchTerm.toLowerCase();
    const brandSuggestions = this.buildBrandSuggestions(query);
    const categorySuggestions = this.buildCategorySuggestions(query);
    const relatedSuggestions = this.buildRelatedSuggestions(query);

    this.headerService.searchProducts(searchTerm, 6).subscribe({
      next: (response: any) => {
        const productSuggestions = (response?.products?.results || [])
          .slice(0, 6)
          .map((product: any): SearchSuggestionItem => {
            const firstDetail = Array.isArray(product.product_details) ? product.product_details[0] : null;
            return {
              label: product.product_name,
              subtitle: product.brand_name || product.category_name || product.product_type_name,
              type: 'product',
              routeValue: product.slug || product.product_slug || this.slugify(product.product_name || ''),
              routeType: 'product',
              image: product.thumbnail_image_url || product.thumbnail_image || null,
              price: firstDetail?.selling_price ?? null,
              originalPrice: firstDetail?.original_price ?? null,
            };
          });

        this.searchSuggestionGroups = [
          this.createSuggestionGroup('Products', 'product', productSuggestions),
          this.createSuggestionGroup('Brands', 'brand', brandSuggestions),
          this.createSuggestionGroup('Categories', 'category', categorySuggestions),
          this.createSuggestionGroup('Related Results', 'related', relatedSuggestions),
        ].filter((group): group is SearchSuggestionGroup => !!group);

        this.suggestionLoading = false;
        this.showSearchSuggestions = true;
      },
      error: () => {
        this.searchSuggestionGroups = [
          this.createSuggestionGroup('Brands', 'brand', brandSuggestions),
          this.createSuggestionGroup('Categories', 'category', categorySuggestions),
          this.createSuggestionGroup('Related Results', 'related', relatedSuggestions),
        ].filter((group): group is SearchSuggestionGroup => !!group);
        this.suggestionLoading = false;
      }
    });
  }

  private buildBrandSuggestions(query: string): SearchSuggestionItem[] {
    return this.allBrandEntries
      .filter((brand) => brand.brand_name.toLowerCase().includes(query))
      .slice(0, 5)
      .map((brand) => ({
        label: brand.brand_name,
        subtitle: 'Brand',
        type: 'brand',
        routeValue: brand.brand_name,
        routeType: 'all',
        image: brand.brand_image || null,
      }));
  }

  private buildCategorySuggestions(query: string): SearchSuggestionItem[] {
    const categoryItems = [
      ...this.panels.flatMap((panel) => panel.categoryItems.map((item) => ({ ...item, subtitle: panel.name }))),
      ...this.mobileQuickLinks.map((item) => ({ label: item.name, value: item.value, type: 'all' as const, subtitle: 'Quick link' }))
    ];

    return categoryItems
      .filter((item) => item.label.toLowerCase().includes(query))
      .filter((item, index, array) => array.findIndex((entry) => entry.label === item.label) === index)
      .slice(0, 5)
      .map((item) => ({
        label: item.label,
        subtitle: item.subtitle,
        type: 'category',
        routeValue: item.value,
        routeType: item.type,
      }));
  }

  private buildRelatedSuggestions(query: string): SearchSuggestionItem[] {
    const relatedItems = this.panels.flatMap((panel) =>
      panel.concernItems.map((item) => ({
        label: item.label,
        value: item.value,
        type: item.type,
        subtitle: `${panel.name} concern`
      }))
    );

    return relatedItems
      .filter((item) => item.label.toLowerCase().includes(query))
      .filter((item, index, array) => array.findIndex((entry) => entry.label === item.label) === index)
      .slice(0, 5)
      .map((item) => ({
        label: item.label,
        subtitle: item.subtitle,
        type: 'related',
        routeValue: item.value,
        routeType: item.type,
      }));
  }

  private createSuggestionGroup(
    title: string,
    type: SearchSuggestionItem['type'],
    items: SearchSuggestionItem[]
  ): SearchSuggestionGroup | null {
    if (!items.length) {
      return null;
    }

    return { title, type, items };
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
        this.allBrandEntries = this.flattenBrands(this.allBrands);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching brands:', err);
        this.loading = false;
      }
    });
  }

  private flattenBrands(groupedBrands: any): Array<{ id?: number; brand_name: string; brand_image?: string }> {
    return Object.values(groupedBrands || {})
      .flatMap((entry: any) => Array.isArray(entry) ? entry : [])
      .filter((brand: any) => !!brand?.brand_name);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    const clickedInsideDesktop = this.desktopSearchShell?.nativeElement?.contains(target);
    const clickedInsideMobile = this.mobileSearchShell?.nativeElement?.contains(target);

    if (!clickedInsideDesktop && !clickedInsideMobile) {
      this.closeSearchSuggestions();
      this.isHeaderSearchFocused = false;
    }
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
    this.pendingSelectionLabel = String(value);
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
    this.cartDrawerPlacement = 'right';
    this.cartDrawerVisible = true
  }
  closeCartDrawer() {
    this.cartDrawerVisible = false;
  }

  openCartProduct(item: CartItem): void {
    const productSlug = this.slugify(item.productName || '');
    if (!productSlug) {
      return;
    }

    this.closeCartDrawer();
    void this.router.navigate(['/products', productSlug]);
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
    const itemKey = item.detailId ?? item.productId;
    void this.cartService.updateQuantity(itemKey, change).catch(() => {
      this.message.error('Unable to update cart right now.');
    });
  }

  trackByCartItem(index: number, item: CartItem): number {
    return item.detailId ?? item.productId;
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

  get headerLogoSrc(): string {
    const theme = this.settingsService.currentTheme;
    const isDarkVariant = theme === ThemeType.dark || theme === ThemeType.coloured;
    return isDarkVariant
      ? 'assets/secure-derma/SecureDerma_DarkMode.png'
      : 'assets/secure-derma/SecureDerma_LightMode.png';
  }

  get mobileLogoSrc(): string {
    return this.headerLogoSrc;
  }

  toggleTheme(): void {
    this.settingsService.toggleLightDark();
  }

  private isDesktopView(): boolean {
    return typeof window !== 'undefined' && window.innerWidth > this.mobileBreakpoint;
  }

  get cartDrawerWidth(): string | number | undefined {
    return this.isDesktopView() ? '28rem' : '100vw';
  }

  get cartDrawerHeight(): string | number | undefined {
    return undefined;
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

  private showSelectionLoader() {
    this.selectionLoaderStartedAt = Date.now();
    this.isSelectionLoading = true;
    if (this.selectionLoaderTimeout) {
      clearTimeout(this.selectionLoaderTimeout);
      this.selectionLoaderTimeout = undefined;
    }
  }

  private hideSelectionLoader() {
    if (!this.isSelectionLoading) {
      return;
    }

    const elapsed = Date.now() - this.selectionLoaderStartedAt;
    const remaining = Math.max(0, 300 - elapsed);

    this.selectionLoaderTimeout = setTimeout(() => {
      this.isSelectionLoading = false;
      this.pendingSelectionLabel = '';
      this.selectionLoaderTimeout = undefined;
    }, remaining);
  }

}
