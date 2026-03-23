import { Assets } from './shared/assets';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  assets = Assets;

  ngOnInit() {
    document.body.style.setProperty('--eclipse', `url(${this.assets.common.eclipse})`);
  }
}
