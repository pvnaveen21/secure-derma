import { Component, HostListener } from '@angular/core';
import { Assets } from '@app/shared/assets';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NavigationEnd, Router } from '@angular/router';
import { SideMenu } from '@app/constants/side_menu';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '@app/shared/icons';
import { NzDrawerModule, NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { SideNavComponent } from '../side-nav/side-nav.component';

@Component({
  selector: 'app-header',
  imports: [
    NzFlexModule,
    LucideAngularModule,
    NzDrawerModule,
    SideNavComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  assets = Assets;
  activeMenu: any = null;
  sideMenu = SideMenu;
  icons = Icons
  visible = false;
  placement: NzDrawerPlacement = 'left';

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
  }

  constructor(
    private router: Router,
  ) {
    this.router.events.subscribe((event) => {
      if (event.constructor === NavigationEnd) {
        this.activeMenu = this.getActiveMenu();
      }
    });
  }

  @HostListener('window:resize', [])
  onResize() {
    this.checkWindowSize();
  }

  private checkWindowSize() {
    if (window.innerWidth >= 1150 && this.visible) {
      this.close();
    }
  }

  getActiveMenu() {
    const currentUrl = this.router.url;
    if (currentUrl === '/dashboard') {
      return { title: 'Dashboard', routerLink: '/dashboard' };
    }

    for (const [_, items] of Object.entries(this.sideMenu)) {
      const found = items.find(item => item.routerLink === currentUrl);
      if (found) {
        return found;
      }
    }

    return null;
  }

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
