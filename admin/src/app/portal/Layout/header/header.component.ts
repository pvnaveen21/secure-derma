import { Component, HostListener } from '@angular/core';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { Router } from '@angular/router';
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
  icons = Icons;
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
  ) {}

  @HostListener('window:resize', [])
  onResize() {
    this.checkWindowSize();
  }

  private checkWindowSize() {
    if (window.innerWidth >= 1150 && this.visible) {
      this.close();
    }
  }

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
