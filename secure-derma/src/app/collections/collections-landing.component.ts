import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionsService } from '../services/collections.service';
import { SeoService } from '../services/seo.service';
import { environment } from '../../environments/environment';

interface CollectionBrand {
  id?: number;
  brand_name: string;
  brand_image?: string;
}

@Component({
  selector: 'app-collections-landing',
  imports: [CommonModule],
  templateUrl: './collections-landing.component.html',
  styleUrl: './collections-landing.component.scss'
})
export class CollectionsLandingComponent implements OnInit {
  brands: CollectionBrand[] = [];
  visibleBrandCount = 10;
  private readonly brandsPageSize = 10;
  private readonly siteUrl = environment.SITE_URL.replace(/\/$/, '');

  constructor(
    private collectionsService: CollectionsService,
    private router: Router,
    private seoService: SeoService,
  ) {}

  ngOnInit() {
    this.seoService.updateSeo({
      title: 'Shop Collections',
      description: 'Browse Secure Derma collections across skin care, hair care, wellness, and dermatologist-recommended routines.',
      canonicalPath: '/collections',
      type: 'website',
      keywords: 'secure derma collections, skincare collections, haircare collections, wellness products',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${this.siteUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Collections', item: `${this.siteUrl}/collections` }
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Secure Derma Collections',
          url: `${this.siteUrl}/collections`
        }
      ]
    });

    this.collectionsService.getBrandsList().subscribe({
      next: (response: any) => {
        this.brands = this.flattenBrands(response);
        this.visibleBrandCount = this.brandsPageSize;
      },
      error: () => {
        this.brands = [];
        this.visibleBrandCount = this.brandsPageSize;
      }
    });
  }

  get visibleBrands(): CollectionBrand[] {
    return this.brands.slice(0, this.visibleBrandCount);
  }

  get hasMoreBrands(): boolean {
    return this.visibleBrandCount < this.brands.length;
  }

  loadMoreBrands() {
    this.visibleBrandCount = Math.min(this.visibleBrandCount + this.brandsPageSize, this.brands.length);
  }

  openBrandCollection(brandName: string) {
    const brandSlug = this.slugify(brandName || '');
    if (!brandSlug) {
      return;
    }

    this.router.navigate(['./collections', brandSlug]);
  }

  private flattenBrands(groupedBrands: any): CollectionBrand[] {
    return Object.keys(groupedBrands || {})
      .sort()
      .flatMap((key) => Array.isArray(groupedBrands[key]) ? groupedBrands[key] : [])
      .filter((brand: any) => !!brand?.brand_name);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
}
