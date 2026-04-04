import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoConfig, SeoService } from '../services/seo.service';
import { environment } from '../../environments/environment';

interface PublicPageSection {
  title: string;
  body?: string;
  bullets?: string[];
}

interface PublicPageFaq {
  question: string;
  answer: string;
}

interface PublicPageAction {
  label: string;
  route?: string;
  href?: string;
}

interface PublicPageData {
  title: string;
  eyebrow: string;
  summary: string;
  sections: PublicPageSection[];
  faqs?: PublicPageFaq[];
  actions?: PublicPageAction[];
  seo: SeoConfig;
}

@Component({
  selector: 'app-public-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './public-page.component.html',
  styleUrl: './public-page.component.scss'
})
export class PublicPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);
  private readonly siteUrl = environment.SITE_URL.replace(/\/$/, '');

  readonly page = this.route.snapshot.data['page'] as PublicPageData;

  ngOnInit(): void {
    this.seoService.updateSeo({
      ...this.page.seo,
      structuredData: this.buildStructuredData()
    });
  }

  private buildStructuredData(): Array<Record<string, unknown>> {
    const structuredData: Array<Record<string, unknown>> = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${this.siteUrl}/`
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: this.page.title,
            item: `${this.siteUrl}${this.page.seo.canonicalPath || ''}`
          }
        ]
      }
    ];

    if (this.page.faqs?.length) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: this.page.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      });
    }

    return structuredData;
  }
}
