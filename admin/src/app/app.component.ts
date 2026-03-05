import { Component, inject, Renderer2 } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ThemeType } from '@app/interfaces/theme';
import { SettingsService } from '@app/services/settings/settings.service';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzFloatButtonModule } from 'ng-zorro-antd/float-button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Assets } from './shared/assets';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [NzFloatButtonModule, NzIconModule, NzDropDownModule, LucideAngularModule, NzButtonModule, RouterOutlet, NzDividerModule,NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  assets = Assets;
  icons = Icons;
  title = 'tej-frontend';
  settingsService = inject(SettingsService);
  currentTheme: ThemeType = ThemeType.light;
  isHomePage = false;
  showSubMenus = false;
  isLoginPage = false;

  constructor(
    private router: Router,
    private renderer: Renderer2,
  ) {
    // this.message$ = this.firebaseMessagingService.message$;
    this.currentTheme = this.settingsService.getCurrentTheme();
    // this.router.events.subscribe((event) => {
    //   if (event instanceof NavigationEnd) {
    //     const currentUrl = event.urlAfterRedirects || event.url;
    //     const cleanUrl = currentUrl.replace(/^\/#/, '/');
    //     this.isHomePage = cleanUrl.startsWith('/home') || cleanUrl.startsWith('/search-product');
    //     this.isLoginPage = cleanUrl.startsWith('/users');
    //     // Remove old classes
    //     // @ts-ignore
    //     this.renderer.removeClass(document.body, 'bg-secondary');
    //     // @ts-ignore
    //     this.renderer.removeClass(document.body, 'bg-primary');

    //     // Add new class
    //     // @ts-ignore
    //     this.renderer.addClass(document.body, this.isHomePage ? 'bg-secondary' : 'bg-primary');
    //   }
    // });

  }

  ngOnInit() {
    document.body.style.setProperty('--eclipse', `url(${this.assets.common.eclipse})`);
  }

  changeTheme(theme: 'auto' | 'dark' | 'light' | 'coloured'): void {
    switch (theme) {
      case 'dark':
        this.settingsService.changeTheme(ThemeType.dark);
        this.currentTheme = ThemeType.dark;
        break;
      case 'light':
        this.settingsService.changeTheme(ThemeType.light);
        this.currentTheme = ThemeType.light;
        break;
      case 'coloured':
        this.settingsService.changeTheme(ThemeType.coloured);
        this.currentTheme = ThemeType.coloured;
        break;
      default:
        this.settingsService.changeTheme(ThemeType.default);
        this.currentTheme = ThemeType.default;
    }
  }
  
}
