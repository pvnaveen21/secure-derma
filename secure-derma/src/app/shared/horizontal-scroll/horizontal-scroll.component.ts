import { Component, ElementRef, Input, ViewChild, AfterViewInit, HostBinding, HostListener } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { timer } from 'rxjs';
import { Icons } from '../icons';

@Component({
  selector: 'app-horizontal-scroll',
  imports: [LucideAngularModule],
  templateUrl: './horizontal-scroll.component.html',
  styleUrl: './horizontal-scroll.component.scss'
})
export class HorizontalScrollComponent {
  @ViewChild('scrollBodyContainer') scrollContainer!: ElementRef<any>;
  @Input() data: any[] = [];
  @Input() scrollDirection: 'horizontal' | 'vertical' = 'horizontal';
  @HostBinding('class.horizontal-scroll-host') get isHorizontalHost() {
    return this.scrollDirection === 'horizontal';
  }
  @HostBinding('class.vertical-scroll-host') get isVerticalHost() {
    return this.scrollDirection === 'vertical';
  }

  icons = Icons;
  showScrollBtns = false;
  canScrollPrev = false;
  canScrollNext = false;

  ngAfterViewInit() {
    setTimeout(() => {
      this.checkLength();
      this.updateScrollButtons();
    }, 0);
  }

  checkLength() {
    const container = this.scrollContainer?.nativeElement;
    if (container && this.data.length > 0) {
      const needsScroll =
        this.scrollDirection === 'horizontal'
          ? container.scrollWidth > container.clientWidth
          : container.scrollHeight > container.clientHeight;

      this.showScrollBtns = needsScroll;
      this.updateScrollButtons();
    } else {
      timer(500).subscribe(() => this.checkLength());
    }
  }

  scrollPrev() {
    const container = this.scrollContainer.nativeElement;
    if (this.scrollDirection === 'horizontal') {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    } else {
      container.scrollBy({ top: -200, behavior: 'smooth' });
    }
    setTimeout(() => this.updateScrollButtons(), 400);
  }

  scrollNext() {
    const container = this.scrollContainer.nativeElement;
    if (this.scrollDirection === 'horizontal') {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    } else {
      container.scrollBy({ top: 200, behavior: 'smooth' });
    }
    setTimeout(() => this.updateScrollButtons(), 400);
  }

  updateScrollButtons() {
    const container = this.scrollContainer?.nativeElement;
    if (!container) return;

    if (this.scrollDirection === 'horizontal') {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      this.canScrollPrev = scrollLeft > 0;
      this.canScrollNext = scrollLeft + clientWidth < scrollWidth - 1;
    } else {
      const { scrollTop, scrollHeight, clientHeight } = container;
      this.canScrollPrev = scrollTop > 0;
      this.canScrollNext = scrollTop + clientHeight < scrollHeight - 1;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateScrollButtons();
  }

  onScroll() {
    this.updateScrollButtons();
  }
}
