import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.isBrowser) {
      this.setRootFontSize(event.target.innerWidth);
    }
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.setRootFontSize(window.innerWidth);
    }
  }

  private setRootFontSize(width: number) {
    const minFontSize = 8;
    const maxFontSize = 16;

    let rootFontSize = width >= 960 ? width / 120 : 16;
    rootFontSize = Math.min(Math.max(rootFontSize, minFontSize), maxFontSize);

    // Calculate as percentage to work with your 62.5% system
    const percentage = (rootFontSize / 16) * 100;
    document.documentElement.style.fontSize = `${percentage}%`;
  }
  // private setRootFontSize(width: number) {
  //   // Optional: clamp font-size for very large/small screens
  //   const minFontSize = 12;
  //   const maxFontSize = 24;

  //   if (width >= 960) {
  //     let rootFontSize = width / 90;
  //     rootFontSize = Math.min(Math.max(rootFontSize, minFontSize), maxFontSize);
  //   }
  // }
}
