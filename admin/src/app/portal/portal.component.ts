import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './Layout/header/header.component';
import { SideNavComponent } from "./Layout/side-nav/side-nav.component";
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { SideMenu } from '@app/constants/side_menu';
import { filter, Subject, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-portal',
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SideNavComponent,
    NzBreadCrumbModule, NzMenuModule, NzLayoutModule, NzButtonModule
  ],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.scss'
})
export class PortalComponent {
  private destroy$ = new Subject<void>();
  status: string = '';
  sideMenu = SideMenu;
  activeUrl: any = ''
  menuHeader: any = ''


  constructor(
    private router: Router,
  ) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.getMenuHeader();
      });
  }

 

  getMenuHeader() {
    const MenuMapping: { [key: string]: string[] } = {};
    Object.entries(this.sideMenu).forEach(([parent, items]) => {
      MenuMapping[parent || 'Dashboard'] = items.map(item => item.currentUrl);
    });
    const currentUrl: any = this.router.url;

    const segments = this.router.url.split('/').filter(Boolean);
    this.activeUrl = segments[0] || '';
    this.menuHeader = this.getMenuPathByUrl(this.activeUrl)

  }
  getMenuPathByUrl(currentUrl: string): string | null {
    for (const [parent, items] of Object.entries(SideMenu)) {
      for (const item of items) {
        if (item.currentUrl.includes(currentUrl) && item.currentUrl.length == 1) {
          return parent ? (parent === 'Reports' ||parent === 'Account'  ? item.title : `${parent} ${item.title}`) : item.title;
        }
        else if (item.currentUrl.includes(currentUrl) && item.currentUrl.length > 1) {

          const index = item.subList.findIndex((value: any) => {
            return value.currentUrl.includes(currentUrl);
          });
          return index !== -1
            ? `${item.subList[index].title}${item.subList[index].title.split(" ").includes("Settings") ? "" : " Settings"}`
            : parent;

          ;
        }
      }
    }
    return null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
