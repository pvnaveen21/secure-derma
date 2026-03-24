import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SideMenu } from '@app/constants/side_menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '@app/shared/icons';
import { AuthService } from '@app/services/auth/auth.service';

@Component({
  selector: 'app-side-nav',
  imports: [NzIconModule, CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent {
  @Output() menuClick = new EventEmitter<void>();

  sideMenu = SideMenu;
  icons = Icons;
  activeUrl: any = 'dashboard';
  subToggle: any = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.router.events.subscribe((event) => {
      if (event.constructor === NavigationEnd) {
        this.updateActiveMenu();
      }
    });
    this.updateActiveMenu();
  }

  private updateActiveMenu(): void {
    const currentUrl = this.router.url.split('?')[0];
    const segments = currentUrl.split('/').filter(Boolean);
    this.activeUrl = segments[0] || '';

    if (['single-layout', 'new-user', 'orders-settings', 'chain-settings', 'warehouse-settings', 'preference-settings'].includes(this.activeUrl)) {
      this.subToggle = true;
    }
  }

  selectMenu(item: any) {
    if (item?.subList) {
      this.subToggle = !this.subToggle;
    } else {
      this.subToggle = false;
    }

    if (item?.currentUrl.includes(this.activeUrl)) {
      return;
    }

    if (item?.title === 'Logout') {
      this.logout();
      return;
    }

    if (!item?.subList) {
      this.onMenuItemClick();
    }

    this.activeUrl = item?.currentUrl[0];
    this.router.navigate([item.routerLink]);
  }

  onMenuItemClick() {
    this.menuClick.emit();
  }

  selectSubMenu(item: any) {
    this.onMenuItemClick();
  }

  logout() {
    this.authService.logout();
  }
}
