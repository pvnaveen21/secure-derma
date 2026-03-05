import { Component, Input } from '@angular/core';
import { SafeHtmlPipe } from './safe-load';

@Component({
  selector: 'svg-load',
  template: `
    <div [innerHTML]="src | safeHtml" [class]="hostClass" class="svg-icons"></div>`,
  imports: [
    SafeHtmlPipe
  ],
})
export class SvgLoad {
  @Input() src: string = '';
  @Input() class: string = '';

  get hostClass() {
    return this.class;
  }
}
