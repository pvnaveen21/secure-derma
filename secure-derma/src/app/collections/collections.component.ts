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
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzMessageService } from 'ng-zorro-antd/message';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { Icons } from '../shared/icons';
import { CollectionsService } from '../services/collections.service';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { CartItem, CartService } from '../services/cart.service';
import { Subscription } from 'rxjs';
import { SeoService } from '../services/seo.service';

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
  slug: string;
  applicable?: boolean;
  count?: number;
}

interface FilterPanel {
  key: string;
  title: string;
  apiParam: string;
  items: FilterItem[];
}

interface SelectedFilterTag {
  panelKey: string;
  panelTitle: string;
  itemSlug: string;
  displayName: string;
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
    private message: NzMessageService,
    private seoService: SeoService
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
  filterPanels: FilterPanel[] = [];
  totalProducts = 0;
  pageSize = 10;
  isProductsLoading = false;
  isLoadingMore = false;
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
  private productRevealTimeout?: ReturnType<typeof setTimeout>;
  private cartSubscription?: Subscription;
  private readonly defaultVisibleFilterItems = 6;
  private previousCollectionSlug: string | null = null;
  expandedFilterPanels = new Set<string>();
  private revealedProductIds = new Set<number>();
  private revealDelayByProductId = new Map<number, string>();
  private readonly filterPanelConfig: Array<{ key: string; title: string; apiParam: string }> = [
    { key: 'product_types', title: 'Product Type', apiParam: 'product_type' },
    { key: 'hair_concerns', title: 'Hair Concerns', apiParam: 'hair_concern' },
    { key: 'skin_concerns', title: 'Skin Concerns', apiParam: 'skin_concern' },
    { key: 'ingredients', title: 'Ingredients', apiParam: 'ingredient' },
    { key: 'brands', title: 'Brand', apiParam: 'brand' },
  ];

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

    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, queryParams]) => {
      const slug = params.get('slug');
      if (!slug) {
        return;
      }

      this.filterProduectValue = this.slugChangesValues[slug] ?? slug;
      this.bannerType = slug;

      if (isPlatformBrowser(this.platformId)) {
        const shouldScrollToTop = Boolean(history.state?.scrollToTop);
        const isCollectionRouteChange = this.previousCollectionSlug !== null && this.previousCollectionSlug !== slug;

        if (shouldScrollToTop || isCollectionRouteChange) {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: 0,
              behavior: 'auto'
            });
          });
        }
      }

      this.selectedFilters = this.readFiltersFromQueryParams();
      this.draftSelectedFilters = this.cloneFiltersMap(this.selectedFilters);
      this.isFilterDrawerVisible = false;
      this.isSortDrawerVisible = false;
      this.updatePaginationSeoTags();
      this.getBanner();
      this.loadProductsForCurrentRoute();
      this.getProductSideMenu();
      this.previousCollectionSlug = slug;
    });
  }

  ngOnDestroy() {
    this.cartSubscription?.unsubscribe();
    if (this.addToCartFeedbackTimeout) {
      clearTimeout(this.addToCartFeedbackTimeout);
    }
    if (this.productRevealTimeout) {
      clearTimeout(this.productRevealTimeout);
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.syncViewportState();
    if (this.bannerType) {
      this.getBanner();
    }
  }

  getProductSideMenu() {
    this.collectionsService.getProducetSideMenu().subscribe({
      next: (response: any) => {
      }
    });
  }

  getBanner() {
    this.bannerImages = [];
    const device: 'web' | 'mobile' = this.isDesktopViewport() ? 'web' : 'mobile';
    this.collectionsService.getBanner(this.bannerType, device).subscribe({
      next: (response: any) => {
        this.bannerImages = response.data;
      }
    });
  }

  getProductsList() {
    this.fetchProducts(false);
  }

  fetchProductsWithFilters() {
    this.fetchProducts(false);
  }

  loadMoreProducts() {
    if (!this.hasMoreProducts || this.isProductsLoading || this.isLoadingMore) {
      return;
    }

    this.shouldScrollToProductsTop = false;
    this.fetchProducts(true);
  }

  private fetchProducts(append: boolean) {
    const filterParams = this.buildFilterQueryParams();
    const pagination = this.getPagination(append);

    if (append) {
      this.isLoadingMore = true;
    } else {
      this.isProductsLoading = true;
    }

    this.collectionsService.getProductsList(
      this.filterProduectValue,
      Object.keys(filterParams).length ? filterParams : undefined,
      pagination
    ).subscribe({
      next: (response: any) => {
        const incomingProducts = response.products?.results || [];
        const mergedProducts = append
          ? [...(this.productsData?.products?.results || []), ...incomingProducts]
          : incomingProducts;

        if (append) {
          this.markProductsForReveal(incomingProducts);
        } else {
          this.clearProductRevealState();
        }

        this.allProducts = mergedProducts;
        this.totalProducts = response.products?.count || 0;
        this.productsData = {
          ...response,
          products: {
            ...response.products,
            results: mergedProducts
          }
        };

        this.filterPanels = this.buildFilterPanels(response.filters);
        this.validateSelectedFilters();

        if (!append) {
          this.applySorting();
        }
        if (!append && this.shouldScrollToProductsTop) {
          this.scrollToProductsTop();
          this.shouldScrollToProductsTop = false;
        }
        this.isProductsLoading = false;
        this.isLoadingMore = false;
      },
      error: () => {
        this.isProductsLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  isProductRevealing(productId: number): boolean {
    return this.revealedProductIds.has(productId);
  }

  getProductRevealDelay(productId: number): string {
    return this.revealDelayByProductId.get(productId) ?? '0ms';
  }

  private markProductsForReveal(products: Product[]): void {
    if (!products.length) {
      this.clearProductRevealState();
      return;
    }

    this.revealedProductIds = new Set(products.map((product) => product.id));
    this.revealDelayByProductId = new Map(
      products.map((product, index) => [product.id, `${index * 55}ms`])
    );

    if (this.productRevealTimeout) {
      clearTimeout(this.productRevealTimeout);
    }

    this.productRevealTimeout = setTimeout(() => {
      this.clearProductRevealState();
    }, 900);
  }

  private clearProductRevealState(): void {
    this.revealedProductIds.clear();
    this.revealDelayByProductId.clear();

    if (this.productRevealTimeout) {
      clearTimeout(this.productRevealTimeout);
      this.productRevealTimeout = undefined;
    }
  }

  get displayedProductsCount(): number {
    return this.productsData?.products?.results?.length || 0;
  }

  get hasMoreProducts(): boolean {
    return this.displayedProductsCount < this.totalProducts;
  }

  // Build query parameters from selected filters
  buildFilterQueryParams(): any {
    const params: any = {};

    this.selectedFilters.forEach((items, panelKey) => {
      if (items.size > 0) {
        const apiParamName = this.getApiParamForPanelKey(panelKey);
        const values = Array.from(items).filter(Boolean);
        params[apiParamName] = values.join(',');
      }
    });

    return params;
  }

  // Check if a filter item is selected
  isFilterSelected(panelKey: string, itemSlug: string): boolean {
    return this.selectedFilters.has(panelKey) &&
      this.selectedFilters.get(panelKey)!.has(itemSlug);
  }

  isFilterDisabled(panelKey: string, itemSlug: string): boolean {
    const panel = this.filterPanels.find((entry) => entry.key === panelKey);
    if (!panel) {
      return true;
    }

    const item = panel.items.find((entry) => entry.slug === itemSlug);
    if (!item) {
      return true;
    }

    if (this.isFilterSelected(panelKey, itemSlug)) {
      return false;
    }

    return item.applicable === false;
  }

  // Handle filter change
  onFilterChange(panelKey: string, itemSlug: string, checked: boolean) {
    if (!this.isValidFilterSelection(panelKey, itemSlug)) {
      this.message.warning('This filter is no longer available. Please choose another option.');
      return;
    }

    if (checked) {
      if (!this.selectedFilters.has(panelKey)) {
        this.selectedFilters.set(panelKey, new Set());
      }
      this.selectedFilters.get(panelKey)!.add(itemSlug);
    } else {
      if (this.selectedFilters.has(panelKey)) {
        this.selectedFilters.get(panelKey)!.delete(itemSlug);
        if (this.selectedFilters.get(panelKey)!.size === 0) {
          this.selectedFilters.delete(panelKey);
        }
      }
    }
    this.updatePageQueryParam();
  }

  // Remove a specific filter
  removeFilter(panelKey: string, itemSlug: string) {
    if (this.selectedFilters.has(panelKey)) {
      this.selectedFilters.get(panelKey)!.delete(itemSlug);
      if (this.selectedFilters.get(panelKey)!.size === 0) {
        this.selectedFilters.delete(panelKey);
      }
    }
    this.updatePageQueryParam();
  }

  // Clear all filters
  clearAllFilters() {
    this.selectedFilters.clear();
    this.updatePageQueryParam();
  }

  // Get all selected filters as a flat array for display
  getAllSelectedFilters(): SelectedFilterTag[] {
    const filters: SelectedFilterTag[] = [];
    this.selectedFilters.forEach((items, panelKey) => {
      const panel = this.filterPanels.find((entry) => entry.key === panelKey);
      items.forEach(itemSlug => {
        const filterItem = panel?.items.find((item) => item.slug === itemSlug);
        filters.push({
          panelKey,
          panelTitle: panel?.title || this.toTitleCase(panelKey.replace(/_/g, ' ')),
          itemSlug,
          displayName: filterItem?.name || this.toTitleCase(itemSlug.replace(/-/g, ' '))
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
  getItemCount(panelKey: string, itemSlug: string): number {
    // Return count from filter data if available
    const panel = this.filterPanels.find(p => p.key === panelKey);
    if (panel) {
      const item = panel.items.find((i) => i.slug === itemSlug);
      if (item && item.count !== undefined) {
        return item.count;
      }
    }

    // Fallback to counting from current products
    return this.allProducts.filter(product => {
      const productValues = this.getProductFilterValues(product, panelKey);
      return productValues.some(value =>
        this.slugify(value) === itemSlug ||
        value.toLowerCase().includes(itemSlug.replace(/-/g, ' '))
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

  get mobileFilterFooterLabel(): string {
    return this.selectedFilterCount > 0
      ? `${this.selectedFilterCount} Filter${this.selectedFilterCount === 1 ? '' : 's'} Applied`
      : 'No Filter Applied';
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
    this.updatePageQueryParam();
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

  productView(product: any) {
    const productSlug = product?.slug || product?.product_slug || this.slugify(product?.product_name || '');
    if (!productSlug) {
      return;
    }

    this.router.navigate([`./products/${productSlug}`], {
      queryParams: {
        collection: this.bannerType
      }
    });
  }

  // product.component.ts
  async addToCart(product: any) {
    try {
      const result = await this.cartService.addToCart(product);

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

  private getPagination(append = false) {
    return {
      limit: this.pageSize,
      offset: append ? this.displayedProductsCount : 0
    };
  }

  private updatePageQueryParam() {
    const filterParams = this.buildFilterQueryParams();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...filterParams,
      },
      replaceUrl: true
    });
    this.updatePaginationSeoTags();
  }

  private updatePaginationSeoTags() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const slug = this.route.snapshot.paramMap.get('slug') || '';
    const collectionName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Collections';
    const filterSummary = this.getAllSelectedFilters().map((filter) => filter.displayName).join(', ');

    this.seoService.updateSeo({
      title: `${collectionName} Collection`,
      description: filterSummary
        ? `Browse ${collectionName} products on Secure Derma. Active filters: ${filterSummary}.`
        : `Browse ${collectionName} products on Secure Derma by type, concern, ingredients, and brand.`,
      canonicalPath: `/collections/${slug}`,
      type: 'website',
      keywords: `${collectionName.toLowerCase()}, secure derma collection, dermatology products`,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://securederma.in/' },
            { '@type': 'ListItem', position: 2, name: 'Collections', item: 'https://securederma.in/collections' },
            { '@type': 'ListItem', position: 3, name: collectionName, item: `https://securederma.in/collections/${slug}` }
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${collectionName} Collection`,
          url: `https://securederma.in/collections/${slug}`,
          description: filterSummary
            ? `Browse ${collectionName} products on Secure Derma. Active filters: ${filterSummary}.`
            : `Browse ${collectionName} products on Secure Derma by type, concern, ingredients, and brand.`
        }
      ]
    });
  }

  isDraftFilterSelected(panelKey: string, itemSlug: string): boolean {
    return this.draftSelectedFilters.has(panelKey) &&
      this.draftSelectedFilters.get(panelKey)!.has(itemSlug);
  }

  isDraftFilterDisabled(panelKey: string, itemSlug: string): boolean {
    const panel = this.filterPanels.find((entry) => entry.key === panelKey);
    if (!panel) {
      return true;
    }

    const item = panel.items.find((entry) => entry.slug === itemSlug);
    if (!item) {
      return true;
    }

    if (this.isDraftFilterSelected(panelKey, itemSlug)) {
      return false;
    }

    return item.applicable === false;
  }

  onDraftFilterChange(panelKey: string, itemSlug: string, checked: boolean) {
    if (!this.isValidFilterSelection(panelKey, itemSlug)) {
      this.message.warning('This filter is no longer available. Please choose another option.');
      return;
    }

    if (checked) {
      if (!this.draftSelectedFilters.has(panelKey)) {
        this.draftSelectedFilters.set(panelKey, new Set());
      }
      this.draftSelectedFilters.get(panelKey)!.add(itemSlug);
    } else {
      if (this.draftSelectedFilters.has(panelKey)) {
        this.draftSelectedFilters.get(panelKey)!.delete(itemSlug);
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

  getVisibleFilterItems(panel: FilterPanel): FilterItem[] {
    if (this.expandedFilterPanels.has(panel.key)) {
      return panel.items;
    }

    return panel.items.slice(0, this.defaultVisibleFilterItems);
  }

  canToggleFilterPanel(panel: FilterPanel): boolean {
    return panel.items.length > this.defaultVisibleFilterItems;
  }

  isFilterPanelExpanded(panelKey: string): boolean {
    return this.expandedFilterPanels.has(panelKey);
  }

  toggleFilterPanel(panelKey: string) {
    if (this.expandedFilterPanels.has(panelKey)) {
      this.expandedFilterPanels.delete(panelKey);
      return;
    }

    this.expandedFilterPanels.add(panelKey);
  }

  private cloneFiltersMap(source: Map<string, Set<string>>): Map<string, Set<string>> {
    const clone = new Map<string, Set<string>>();
    source.forEach((items, key) => {
      clone.set(key, new Set(items));
    });
    return clone;
  }

  private buildFilterPanels(filters: Record<string, FilterItem[]> | undefined): FilterPanel[] {
    if (!filters) {
      return [];
    }

    return this.filterPanelConfig
      .map((config) => ({
        key: config.key,
        title: config.title,
        apiParam: config.apiParam,
        items: (filters[config.key] || [])
          .filter((item) => item?.slug && item?.name)
          .map((item) => ({
            name: item.name,
            slug: item.slug,
            applicable: item.applicable !== false,
            count: item.count,
          })),
      }))
      .filter((panel) => panel.items.length > 0);
  }

  private validateSelectedFilters() {
    let removedAny = false;
    const cleanedFilters = new Map<string, Set<string>>();

    this.selectedFilters.forEach((items, panelKey) => {
      const panel = this.filterPanels.find((entry) => entry.key === panelKey);
      if (!panel) {
        removedAny = true;
        return;
      }

      const validApplicableSlugs = new Set(
        panel.items
          .filter((item) => item.applicable !== false)
          .map((item) => item.slug)
      );
      const retained = new Set(
        Array.from(items).filter((itemSlug) => validApplicableSlugs.has(itemSlug))
      );

      if (retained.size > 0) {
        cleanedFilters.set(panelKey, retained);
      }

      if (retained.size !== items.size) {
        removedAny = true;
      }
    });

    this.selectedFilters = cleanedFilters;
    this.draftSelectedFilters = this.cloneFiltersMap(cleanedFilters);

    if (removedAny) {
      this.updatePageQueryParam();
    }
  }

  private isValidFilterSelection(panelKey: string, itemSlug: string): boolean {
    const panel = this.filterPanels.find((entry) => entry.key === panelKey);
    return Boolean(panel?.items.some((item) => item.slug === itemSlug));
  }

  private toTitleCase(value: string): string {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getApiParamForPanelKey(panelKey: string): string {
    return this.filterPanelConfig.find((panel) => panel.key === panelKey)?.apiParam || panelKey;
  }

  private readFiltersFromQueryParams(): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    const queryParams = this.route.snapshot.queryParamMap;

    this.filterPanelConfig.forEach((panel) => {
      const rawValue = queryParams.get(panel.apiParam);
      if (!rawValue) {
        return;
      }

      const slugs = rawValue
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (slugs.length) {
        result.set(panel.key, new Set(slugs));
      }
    });

    return result;
  }

  private loadProductsForCurrentRoute() {
    if (this.selectedFilterCount > 0) {
      this.fetchProductsWithFilters();
      return;
    }

    this.getProductsList();
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
