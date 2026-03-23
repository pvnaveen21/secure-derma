import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  image?: string;
  type?: string;
  keywords?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  updateSeo(config: SeoConfig): void {
    const siteName = 'Secure Derma';
    const normalizedTitle = config.title.replace(new RegExp(`\\s*\\|?\\s*${siteName}`, 'ig'), '').trim();
    const fullTitle = normalizedTitle ? `${siteName} | ${normalizedTitle}` : siteName;

    this.title.setTitle(fullTitle);
    this.updateTag('name', 'description', config.description);
    this.updateTag('name', 'robots', config.robots || 'index,follow');

    if (config.keywords) {
      this.updateTag('name', 'keywords', config.keywords);
    } else {
      this.meta.removeTag("name='keywords'");
    }

    this.updateTag('property', 'og:title', fullTitle);
    this.updateTag('property', 'og:description', config.description);
    this.updateTag('property', 'og:type', config.type || 'website');
    this.updateTag('property', 'og:site_name', siteName);
    this.updateTag('name', 'twitter:card', config.image ? 'summary_large_image' : 'summary');
    this.updateTag('name', 'twitter:title', fullTitle);
    this.updateTag('name', 'twitter:description', config.description);

    if (config.canonicalPath && isPlatformBrowser(this.platformId)) {
      const canonicalUrl = new URL(config.canonicalPath, this.document.location.origin).toString();
      this.updateTag('property', 'og:url', canonicalUrl);
      this.setCanonical(canonicalUrl);
    }

    if (config.image) {
      this.updateTag('property', 'og:image', config.image);
      this.updateTag('name', 'twitter:image', config.image);
    } else {
      this.meta.removeTag("property='og:image'");
      this.meta.removeTag("name='twitter:image'");
    }
  }

  private updateTag(attr: 'name' | 'property', value: string, content: string): void {
    this.meta.updateTag({ [attr]: value, content });
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
