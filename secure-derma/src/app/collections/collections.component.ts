import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef, Component, ElementRef, HostListener, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzMessageService } from 'ng-zorro-antd/message';
import { distinctUntilChanged, map } from 'rxjs';
import { Icons } from '../shared/icons';
import { CollectionsService } from '../services/collections.service';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { CartItem, CartService } from '../services/cart.service';
import { Subscription } from 'rxjs';

interface Product {
  id: number;
  product_name: string;
  brand: string;
  thumbnail_image: string;
  hover_image?: string;
  badge?: 'BEST SELLER' | 'NEW';
  rating?: number;
  price?: string;
  product_description?: string;
  product_types?: string[];
  hair_concerns?: string[];
  skin_concerns?: string[];
  ingredients?: string[];
}

interface FilterItem {
  name: string;
  value?: string;
}

@Component({
  selector: 'app-collections',
  imports: [
    CommonModule,
    NzCarouselModule,
    NzDividerModule,
    NzCollapseModule,
    LucideAngularModule,
    FormsModule,
    NzCheckboxModule,
    NzCardModule,
    NzRateModule,
    NzTagModule,
    NzSelectModule,
    NzPaginationModule,
    NzDrawerModule,
  ],
  templateUrl: './collections.component.html',
  styleUrl: './collections.component.scss'
})
export class CollectionsComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private collectionsService: CollectionsService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private cartService: CartService,
    private message: NzMessageService
  ) { }

  bannerType: any;
  bannerImages: any = [];
  slugChangesValues: any = {
    'skin-care': 'skin',
    'hair-care': 'hair'
  }
  icons = Icons;
  sortBy: string = 'az';
  filterProduectValue: any = '';

  // Filter related properties
  selectedFilters: Map<string, Set<string>> = new Map();
  draftSelectedFilters: Map<string, Set<string>> = new Map();
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  productsData: any = {};
  filterPanels: any[] = [];
  totalProducts = 0;
  pageIndex = 1;
  pageSize = 5;
  isProductsLoading = false;
  isFilterDrawerVisible = false;
  isSortDrawerVisible = false;
  private readonly mobileBreakpoint = 1024;
  private shouldScrollToProductsTop = false;
  @ViewChild('productsTopAnchor') productsTopAnchor?: ElementRef<HTMLElement>;
  cartItemsCount = 0;
  cartSubtotal = 0;
  cartSavings = 0;
  recentlyAddedProductId: number | null = null;
  private addToCartFeedbackTimeout?: ReturnType<typeof setTimeout>;
  private cartSubscription?: Subscription;

  ngOnInit() {
    this.syncViewportState();

    this.cartSubscription = this.cartService.cart$.subscribe((items: CartItem[]) => {
      this.cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
      this.cartSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      this.cartSavings = items.reduce((sum, item) => {
        const original = item.originalPrice ?? item.price;
        const itemSaving = Math.max(original - item.price, 0) * item.quantity;
        return sum + itemSaving;
      }, 0);
    });

    this.route.paramMap
      .pipe(
        map(params => params.get('slug')),
        distinctUntilChanged()
      )
      .subscribe(slug => {
        if (!slug) return;

        this.filterProduectValue = this.slugChangesValues[slug] ?? slug;
        this.bannerType = slug;

        if (isPlatformBrowser(this.platformId)) {
          const shouldScrollToTop = Boolean(history.state?.scrollToTop);

          if (shouldScrollToTop) {
            requestAnimationFrame(() => {
              window.scrollTo({
                top: 0,
                behavior: 'auto'
              });
            });
          }
        }

        // Reset filters on route change
        this.selectedFilters.clear();
        this.pageIndex = this.getPageFromQueryParam();
        this.isFilterDrawerVisible = false;
        this.isSortDrawerVisible = false;
        this.updatePaginationSeoTags();
        this.getBanner();
        this.getProductsList();
        this.getProductSideMenu();
      });
  }

  ngOnDestroy() {
    this.cartSubscription?.unsubscribe();
    if (this.addToCartFeedbackTimeout) {
      clearTimeout(this.addToCartFeedbackTimeout);
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.syncViewportState();
  }

  getProductSideMenu() {
    this.collectionsService.getProducetSideMenu().subscribe({
      next: (response: any) => {
        // console.log(response);
      }
    });
  }

  getBanner() {
    this.bannerImages = [];
    this.collectionsService.getBanner(this.bannerType).subscribe({
      next: (response: any) => {
        this.bannerImages = response.data;
      }
    });
  }

  getProductsList() {
    this.isProductsLoading = true;
    this.collectionsService.getProductsList(
      this.filterProduectValue,
      undefined,
      this.getPagination()
    ).subscribe({
      next: (response: any) => {
        this.allProducts = response.products?.results || [];
        this.totalProducts = response.products?.count || 0;
        this.productsData = {
          ...response,
          products: {
            ...response.products,
            results: this.allProducts
          }
        };

        const filters = response.filters;
        this.filterPanels = []
        this.filterPanels = [
          { key: 'product_types', title: 'Product Type', items: filters.product_types || [] },
          { key: 'hair_concerns', title: 'Hair Concerns', items: filters.hair_concerns || [] },
          { key: 'skin_concerns', title: 'Skin Concerns', items: filters.skin_concerns || [] },
          { key: 'ingredients', title: 'Ingredients', items: filters.ingredients || [] },
        ];

        this.applySorting();
        if (this.shouldScrollToProductsTop) {
          this.scrollToProductsTop();
          this.shouldScrollToProductsTop = false;
        }
        this.isProductsLoading = false;
      },
      error: () => {
        this.isProductsLoading = false;
      }
    });
  }

  // Fetch products with filter query parameters
  fetchProductsWithFilters() {
    const filterParams = this.buildFilterQueryParams();
    this.isProductsLoading = true;

    this.collectionsService.getProductsList(
      this.filterProduectValue,
      filterParams,
      this.getPagination()
    ).subscribe({
      next: (response: any) => {
        this.allProducts = response.products?.results || [];
        this.totalProducts = response.products?.count || 0;
        this.productsData = {
          ...response,
          products: {
            ...response.products,
            results: this.allProducts
          }
        };
        const filters = response.filters;
        this.filterPanels = [
          { key: 'product_types', title: 'Product Type', items: filters.product_types || [] },
          { key: 'hair_concerns', title: 'Hair Concerns', items: filters.hair_concerns || [] },
          { key: 'skin_concerns', title: 'Skin Concerns', items: filters.skin_concerns || [] },
          { key: 'ingredients', title: 'Ingredients', items: filters.ingredients || [] },
        ];

        this.applySorting();
        if (this.shouldScrollToProductsTop) {
          this.scrollToProductsTop();
          this.shouldScrollToProductsTop = false;
        }
        this.isProductsLoading = false;
      },
      error: () => {
        this.isProductsLoading = false;
      }
    });
  }

  // Build query parameters from selected filters
  buildFilterQueryParams(): any {
    const params: any = {};

    // Convert filter panel keys to API parameter names
    const filterKeyMapping: any = {
      'product_types': 'product_type',
      'hair_concerns': 'hair_concern',
      'skin_concerns': 'skin_concern',
      'ingredients': 'ingredient'
    };

    this.selectedFilters.forEach((items, panelKey) => {
      if (items.size > 0) {
        const apiParamName = filterKeyMapping[panelKey] || panelKey;
        // Convert Set to array and join with commas, then slugify each value
        const values = Array.from(items).map(item => this.slugify(item));
        params[apiParamName] = values.join(',');
      }
    });

    return params;
  }

  // Check if a filter item is selected
  isFilterSelected(panelKey: string, itemName: string): boolean {
    return this.selectedFilters.has(panelKey) &&
      this.selectedFilters.get(panelKey)!.has(itemName);
  }

  // Handle filter change
  onFilterChange(panelKey: string, itemName: string, checked: boolean) {
    if (checked) {
      if (!this.selectedFilters.has(panelKey)) {
        this.selectedFilters.set(panelKey, new Set());
      }
      this.selectedFilters.get(panelKey)!.add(itemName);
    } else {
      if (this.selectedFilters.has(panelKey)) {
        this.selectedFilters.get(panelKey)!.delete(itemName);
        if (this.selectedFilters.get(panelKey)!.size === 0) {
          this.selectedFilters.delete(panelKey);
        }
      }
    }
    this.pageIndex = 1;
    this.updatePageQueryParam();
    this.fetchProductsWithFilters();
  }

  // Remove a specific filter
  removeFilter(panelKey: string, itemName: string) {
    if (this.selectedFilters.has(panelKey)) {
      this.selectedFilters.get(panelKey)!.delete(itemName);
      if (this.selectedFilters.get(panelKey)!.size === 0) {
        this.selectedFilters.delete(panelKey);
      }
    }
    this.pageIndex = 1;
    this.updatePageQueryParam();
    this.fetchProductsWithFilters();
  }

  // Clear all filters
  clearAllFilters() {
    this.selectedFilters.clear();
    this.pageIndex = 1;
    this.updatePageQueryParam();
    this.fetchProductsWithFilters();
  }

  // Get all selected filters as a flat array for display
  getAllSelectedFilters(): Array<{ panelKey: string, itemName: string, displayName: string }> {
    const filters: Array<{ panelKey: string, itemName: string, displayName: string }> = [];
    this.selectedFilters.forEach((items, panelKey) => {
      items.forEach(itemName => {
        filters.push({
          panelKey,
          itemName,
          displayName: itemName
        });
      });
    });
    return filters;
  }

  get selectedFilterCount(): number {
    let total = 0;
    this.selectedFilters.forEach((items) => {
      total += items.size;
    });
    return total;
  }

  // Apply filters to products
  applyFilters() {
    // This method is now deprecated since we're fetching from API
    // Kept for backwards compatibility if needed
    this.applySorting();
  }

  // Get product values for a specific filter category
  private getProductFilterValues(product: any, panelKey: string): string[] {
    const values: string[] = [];

    switch (panelKey) {
      case 'product_types':
        if (product.product_types) {
          values.push(...product.product_types);
        }
        break;
      case 'hair_concerns':
        if (product.hair_concerns) {
          values.push(...product.hair_concerns);
        }
        break;
      case 'skin_concerns':
        if (product.skin_concerns) {
          values.push(...product.skin_concerns);
        }
        break;
      case 'ingredients':
        if (product.ingredients) {
          values.push(...product.ingredients);
        }
        break;
    }

    return values;
  }

  // Get numeric selling price for sorting
  private getProductPrice(product: any): number {
    const detailPrice = product?.details?.[0]?.selling_price;
    if (typeof detailPrice === 'number') {
      return detailPrice;
    }

    const priceString = product?.price;
    if (!priceString) return 0;
    const match = String(priceString).match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  }

  // Get count of products for each filter item
  getItemCount(panelKey: string, itemName: string): number {
    // Return count from filter data if available
    const panel = this.filterPanels.find(p => p.key === panelKey);
    if (panel) {
      const item = panel.items.find((i: any) => i.name === itemName);
      if (item && item.count !== undefined) {
        return item.count;
      }
    }

    // Fallback to counting from current products
    return this.allProducts.filter(product => {
      const productValues = this.getProductFilterValues(product, panelKey);
      return productValues.some(value =>
        value.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(value.toLowerCase())
      );
    }).length;
  }

  // Apply sorting to filtered products
  applySorting() {
    const products = this.productsData?.products?.results || [];

    switch (this.sortBy) {
      case 'az':
        products.sort((a: any, b: any) =>
          String(a.product_name || '').localeCompare(String(b.product_name || ''), undefined, { sensitivity: 'base' })
        );
        break;
      case 'za':
        products.sort((a: any, b: any) =>
          String(b.product_name || '').localeCompare(String(a.product_name || ''), undefined, { sensitivity: 'base' })
        );
        break;
      case 'price-low':
        products.sort((a: any, b: any) => {
          const priceA = this.getProductPrice(a);
          const priceB = this.getProductPrice(b);
          return priceA - priceB;
        });
        break;
      case 'price-high':
        products.sort((a: any, b: any) => {
          const priceA = this.getProductPrice(a);
          const priceB = this.getProductPrice(b);
          return priceB - priceA;
        });
        break;
      default:
        products.sort((a: any, b: any) =>
          String(a.product_name || '').localeCompare(String(b.product_name || ''), undefined, { sensitivity: 'base' })
        );
        break;
    }

    // Update the products data with sorted results
    this.productsData = {
      ...this.productsData,
      products: {
        ...this.productsData.products,
        results: products
      }
    };
  }

  // Handle sort change
  onSortChange() {
    this.applySorting();
  }

  get sortByLabel(): string {
    switch (this.sortBy) {
      case 'za':
        return 'Z-A';
      case 'price-low':
        return 'Price: Low-High';
      case 'price-high':
        return 'Price: High-Low';
      case 'az':
      default:
        return 'A-Z';
    }
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    this.updatePageQueryParam();
    this.shouldScrollToProductsTop = true;
    this.fetchProductsWithFilters();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 1;
    this.updatePageQueryParam();
    this.fetchProductsWithFilters();
  }

  openFilterDrawer() {
    if (this.isDesktopViewport()) {
      return;
    }
    this.draftSelectedFilters = this.cloneFiltersMap(this.selectedFilters);
    this.isFilterDrawerVisible = true;
  }

  closeFilterDrawer() {
    this.draftSelectedFilters = this.cloneFiltersMap(this.selectedFilters);
    this.isFilterDrawerVisible = false;
  }

  applyFilterChanges() {
    this.selectedFilters = this.cloneFiltersMap(this.draftSelectedFilters);
    this.pageIndex = 1;
    this.updatePageQueryParam();
    this.fetchProductsWithFilters();
    this.closeFilterDrawer();
  }

  openSortDrawer() {
    if (this.isDesktopViewport()) {
      return;
    }
    this.isSortDrawerVisible = true;
  }

  closeSortDrawer() {
    this.isSortDrawerVisible = false;
  }

  applySortFromDrawer(value: string) {
    this.sortBy = value;
    this.onSortChange();
    this.closeSortDrawer();
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  productView(value: any) {
    this.router.navigate([`./products/${this.slugify(value)}`], {
      queryParams: {
        collection: this.bannerType
      }
    });
  }

  // product.component.ts
  addToCart(product: any) {
    const result = this.cartService.addToCart(product);

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
  }

  private getPagination() {
    return {
      limit: this.pageSize,
      offset: (this.pageIndex - 1) * this.pageSize
    };
  }

  private getPageFromQueryParam(): number {
    const pageValue = Number(this.route.snapshot.queryParamMap.get('page'));
    return Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  }

  private updatePageQueryParam() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.pageIndex > 1 ? this.pageIndex : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.updatePaginationSeoTags();
  }

  private updatePaginationSeoTags() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const slug = this.route.snapshot.paramMap.get('slug') || '';
    const pageSuffix = this.pageIndex > 1 ? `?page=${this.pageIndex}` : '';
    const canonicalHref = `${this.document.location.origin}/collections/${slug}${pageSuffix}`;
    const prevHref = this.pageIndex > 2
      ? `${this.document.location.origin}/collections/${slug}?page=${this.pageIndex - 1}`
      : `${this.document.location.origin}/collections/${slug}`;
    const nextHref = `${this.document.location.origin}/collections/${slug}?page=${this.pageIndex + 1}`;

    this.upsertLinkTag('canonical', canonicalHref);
    if (this.pageIndex > 1) {
      this.upsertLinkTag('prev', prevHref);
    } else {
      this.removeLinkTag('prev');
    }
    this.upsertLinkTag('next', nextHref);

    const collectionName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Collections';
    this.document.title = this.pageIndex > 1
      ? `${collectionName} - Page ${this.pageIndex} | Secure Derma`
      : `${collectionName} | Secure Derma`;
  }

  private upsertLinkTag(rel: string, href: string) {
    const head = this.document.head;
    let link = head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', rel);
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private removeLinkTag(rel: string) {
    const link = this.document.head.querySelector(`link[rel="${rel}"]`);
    if (link) {
      link.remove();
    }
  }

  isDraftFilterSelected(panelKey: string, itemName: string): boolean {
    return this.draftSelectedFilters.has(panelKey) &&
      this.draftSelectedFilters.get(panelKey)!.has(itemName);
  }

  onDraftFilterChange(panelKey: string, itemName: string, checked: boolean) {
    if (checked) {
      if (!this.draftSelectedFilters.has(panelKey)) {
        this.draftSelectedFilters.set(panelKey, new Set());
      }
      this.draftSelectedFilters.get(panelKey)!.add(itemName);
    } else {
      if (this.draftSelectedFilters.has(panelKey)) {
        this.draftSelectedFilters.get(panelKey)!.delete(itemName);
        if (this.draftSelectedFilters.get(panelKey)!.size === 0) {
          this.draftSelectedFilters.delete(panelKey);
        }
      }
    }
  }

  clearDraftFilters() {
    this.draftSelectedFilters.clear();
  }

  get draftSelectedFilterCount(): number {
    let total = 0;
    this.draftSelectedFilters.forEach((items) => {
      total += items.size;
    });
    return total;
  }

  private cloneFiltersMap(source: Map<string, Set<string>>): Map<string, Set<string>> {
    const clone = new Map<string, Set<string>>();
    source.forEach((items, key) => {
      clone.set(key, new Set(items));
    });
    return clone;
  }

  private scrollToProductsTop() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const targetEl = this.productsTopAnchor?.nativeElement;
      if (!targetEl) {
        return;
      }

      const headerOffset = this.getStickyHeaderOffset();
      const absoluteTop = targetEl.getBoundingClientRect().top + window.scrollY;
      const targetTop = Math.max(absoluteTop - headerOffset - 8, 0);

      window.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });
    }, 30);
  }

  private getStickyHeaderOffset(): number {
    const selectors = ['.header-container', '.secura-header-container'];
    return selectors.reduce((total, selector) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        return total;
      }

      const style = window.getComputedStyle(el);
      const isStickyLayer = style.position === 'sticky' || style.position === 'fixed';
      if (!isStickyLayer) {
        return total;
      }

      return total + el.getBoundingClientRect().height;
    }, 0);
  }

  private syncViewportState() {
    if (!this.isDesktopViewport()) {
      return;
    }

    this.isFilterDrawerVisible = false;
    this.isSortDrawerVisible = false;
    this.draftSelectedFilters = this.cloneFiltersMap(this.selectedFilters);
  }

  private isDesktopViewport(): boolean {
    return isPlatformBrowser(this.platformId) && window.innerWidth > this.mobileBreakpoint;
  }
}
