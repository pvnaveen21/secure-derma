import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-portal',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.scss'
})
export class PortalComponent {
  isScrolled = false;
  isNavigating = false;
  contentMinHeight = 0;
  private navigationSubscription?: Subscription;
  @ViewChild('pageContent') private pageContent?: ElementRef<HTMLElement>;

  constructor(private readonly router: Router) { }

  ngOnInit(): void {
    this.navigationSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.lockContentHeight();
        this.isNavigating = true;
        return;
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.releaseContentHeight();

        if (event instanceof NavigationEnd) {
          this.scrollToTop();
        }
      }
    });
  }

  private scrollToTop(): void {
    const forceScroll = () => {
      const html = document.documentElement;

      if (html.classList.contains('cdk-global-scrollblock')) {
        html.classList.remove('cdk-global-scrollblock');
      }
      html.style.position = '';
      html.style.top = '';
      html.style.width = '';
      html.style.overflow = '';
      html.style.scrollBehavior = 'auto';

      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.overflow = '';

      window.scrollTo(0, 0);
      html.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    forceScroll();

    [100, 300, 600].forEach((delay) => {
      setTimeout(() => forceScroll(), delay);
    });
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollTop > 50;
  }

  private lockContentHeight(): void {
    const currentHeight = this.pageContent?.nativeElement.getBoundingClientRect().height || 0;
    if (currentHeight > 0) {
      this.contentMinHeight = Math.ceil(currentHeight);
    }
  }

  private releaseContentHeight(): void {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.isNavigating = false;
        this.contentMinHeight = 0;
      });
    });
  }
}
