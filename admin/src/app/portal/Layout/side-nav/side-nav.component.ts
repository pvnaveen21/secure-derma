import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SideMenu } from '@app/constants/side_menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { LucideAngularModule } from "lucide-angular";
import { Assets } from '@app/shared/assets';
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
  assets = Assets;
  icons = Icons;
  activeMenu: string = '';
  activeUrl: any = 'dashboard'
  currentUserType: any = ''
  subToggle: any = false

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.router.events.subscribe((event) => {
      if (event.constructor === NavigationEnd) {
        this.activeMenu = this.getActiveMenu();

      }
    });
    this.getActiveMenu()
  }
  ngOnInit() {
// this.currentUserType = this.authService.user.user_type

    // Any additional setup can be done here
  }
  getActiveMenu(): string {
    const currentUrl = this.router.url.split('?')[0];
    const segments = currentUrl.split('/').filter(Boolean);
    this.activeUrl = segments[0] || '';
    if (['single-layout', 'new-user', 'orders-settings', 'chain-settings', 'warehouse-settings', 'preference-settings'].includes(this.activeUrl)) {
      this.subToggle = true
    }

    for (const [_, items] of Object.entries(this.sideMenu)) {
      const index = items.findIndex(item => item.routerLink === currentUrl)
      return items[index]?.routerLink || '';
    }
    return '';
  }
  selectMenu(item: any) {
    if (item?.subList) {
      this.subToggle = !this.subToggle
    }
    else {
      this.subToggle = false
    }
    if (item?.currentUrl.includes(this.activeUrl)) {
      return;
    }

    if (item?.title === 'Logout') {
      this.logout();
      return;
    }
    if (!item?.subList) {
      this.onMenuItemClick()
    }
    this.activeUrl = item?.currentUrl[0]
    this.router.navigate([item.routerLink])
  }
  onMenuItemClick() {
    this.menuClick.emit(); // Notify parent when any menu is clicked
  }

  selectSubMenu(item: any) {
    this.onMenuItemClick()

  }

  hasPermission(items: any[], permission: number): boolean {
return items?.some(item => item.permissions?.includes(permission));
  }

  logout() {
    this.authService.logout();
  }
}
