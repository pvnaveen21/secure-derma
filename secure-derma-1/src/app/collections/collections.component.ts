import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
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
import { distinctUntilChanged, map } from 'rxjs';
import { Icons } from '../shared/icons';
import { CollectionsService } from '../services/collections.service';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../services/cart.service';

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
    private cdr: ChangeDetectorRef,
    private cartService: CartService
  ) { }

  bannerType: any;
  bannerImages: any = [];
  slugChangesValues: any = {
    'skin-care': 'skin',
    'hair-care': 'hair'
  }
  icons = Icons;
  sortBy: string = 'featured';
  filterProduectValue: any = '';

  // Filter related properties
  selectedFilters: Map<string, Set<string>> = new Map();
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  productsData: any = {};
  filterPanels: any[] = [];

  ngOnInit() {
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
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }

        // Reset filters on route change
        this.selectedFilters.clear();
        this.getBanner();
        this.getProductsList();
        this.getProductSideMenu();
      });
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
    this.collectionsService.getProductsList(this.filterProduectValue).subscribe({
      next: (response: any) => {
        console.log(response);
        this.allProducts = response.products?.results || [];
        this.productsData = {
          ...response,
          products: {
            ...response.products,
            results: this.allProducts
          }
        };

        const filters = response.filters;
        this.filterPanels=[]
        this.filterPanels = [
          { key: 'product_types', title: 'Product Type', items: filters.product_types || [] },
          { key: 'hair_concerns', title: 'Hair Concerns', items: filters.hair_concerns || [] },
          { key: 'skin_concerns', title: 'Skin Concerns', items: filters.skin_concerns || [] },
          { key: 'ingredients', title: 'Ingredients', items: filters.ingredients || [] },
        ];

        this.applySorting();
      }
    });
  }

  // Fetch products with filter query parameters
  fetchProductsWithFilters() {
    const filterParams = this.buildFilterQueryParams();

    this.collectionsService.getProductsList(this.filterProduectValue, filterParams).subscribe({
      next: (response: any) => {
        console.log('Filtered products:', response);
        this.allProducts = response.products?.results || [];
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
    this.fetchProductsWithFilters();
  }

  // Clear all filters
  clearAllFilters() {
    this.selectedFilters.clear();
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

  // Extract numeric price from price string
  private extractPrice(priceString?: string): number {
    if (!priceString) return 0;
    const match = priceString.match(/[\d,]+\.?\d*/);
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
      case 'price-low':
        products.sort((a: any, b: any) => {
          const priceA = this.extractPrice(a.price);
          const priceB = this.extractPrice(b.price);
          return priceA - priceB;
        });
        break;
      case 'price-high':
        products.sort((a: any, b: any) => {
          const priceA = this.extractPrice(a.price);
          const priceB = this.extractPrice(b.price);
          return priceB - priceA;
        });
        break;
      case 'newest':
        products.sort((a: any, b: any) => b.id - a.id);
        break;
      case 'featured':
      default:
        // Keep original order
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

  slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  productView(value: any) {
    this.router.navigate([`./products/${this.slugify(value)}`]);
  }

  // product.component.ts
  addToCart(product: any) {
    this.cartService.addToCart(product);
    // Optional: show notification
    // this.nzMessageService?.success('Added to cart!');
  }
}
