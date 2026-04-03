import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SECURE_DERMA_BUSINESS_INFO } from '../core/business-info';
import { ThemeType } from '../interfaces/theme';
import { SettingsService } from '../services/settings/settings.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  private readonly router = inject(Router);
  private readonly settingsService = inject(SettingsService);
  readonly businessInfo = SECURE_DERMA_BUSINESS_INFO;

  get footerLogoSrc(): string {
    const theme = this.settingsService.currentTheme;
    const isDarkVariant = theme === ThemeType.dark || theme === ThemeType.coloured;
    return isDarkVariant
      ? 'assets/secure-derma/SecureDerma_DarkMode.png'
      : 'assets/secure-derma/SecureDerma_LightMode.png';
  }

  navigateToCollection(value: string): void {
    const slug = this.slugify(value);
    if (!slug) {
      return;
    }

    void this.router.navigate([`/collections/${slug}`], {
      state: {
        scrollToTop: true
      }
    });
  }

  navigateToHome(): void {
    void this.router.navigate(['/'], {
      state: {
        scrollToTop: true
      }
    });
  }

  navigateToRoute(route: string): void {
    void this.router.navigate([route], {
      state: {
        scrollToTop: true
      }
    });
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
