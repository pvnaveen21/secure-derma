import { Component, HostListener } from '@angular/core';
import { SvgLoad } from '@app/shared/assets/svg-load';
import { Assets } from '@app/shared/assets';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SideMenu } from '@app/constants/side_menu';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '@app/shared/icons';
import { NzDrawerModule, NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { SideNavComponent } from '../side-nav/side-nav.component';


@Component({
  selector: 'app-header',
  imports: [
    SvgLoad,
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
  ngOnInit() {
    // Any additional setup can be done here
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
        return found; // return the whole object { title, routerLink, ... }
      }
    }

    return null;
  }

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }


}
