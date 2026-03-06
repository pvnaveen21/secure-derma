import { Injectable } from '@angular/core';
import { AuthService } from '@app/services/auth/auth.service';
import { ThemeType } from "@app/interfaces/theme";

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  theme = {
    'auto': ThemeType.default,
    'dark': ThemeType.dark,
    'default': ThemeType.light,
    'coloured': ThemeType.coloured
  }

  // Uncomment the line below to set the default theme based on user's system preference
  // currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? ThemeType.dark : ThemeType.light;

  // default theme is light
  currentTheme: ThemeType = ThemeType.light;

  getStoredTheme = () => localStorage.getItem('theme')
  setStoredTheme = (theme: any) => localStorage.setItem('theme', theme)

  constructor(
    private auth: AuthService,
  ) {
    const storedTheme: any = this.getStoredTheme();
    if (storedTheme && storedTheme !== 'auto') {
      // @ts-ignore
      this.currentTheme = this.theme[storedTheme];
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      const storedTheme = this.getStoredTheme();
      if (storedTheme === 'auto') {
        this.currentTheme = e.matches ? ThemeType.dark : ThemeType.light;
        this.loadTheme(false).then().catch(console.error);
      }
    });
  }

  private removeUnusedTheme(theme: ThemeType): void {
    document.documentElement.classList.remove(theme);
    const removedThemeStyle = document.getElementById(theme);
    if (removedThemeStyle) {
      document.head.removeChild(removedThemeStyle);
    }
  }

  private loadCss(href: string, id: string): Promise<Event> {
    return new Promise((resolve, reject) => {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = href;
      style.id = id;
      style.onload = resolve;
      style.onerror = reject;
      document.head.append(style);
    });
  }

  public loadTheme(firstLoad = true): Promise<Event> {
    const theme = this.currentTheme;
    if (firstLoad) {
      document.documentElement.classList.add(theme);
    }
    return new Promise<Event>((resolve, reject) => {
      this.loadCss(`${theme}.css`, theme).then(
        (e) => {
          if (!firstLoad) {
            document.documentElement.classList.add(theme);
          }
          this.removeThemeAfterChanges(theme);

          resolve(e);
        },
        (e) => reject(e)
      );
    });
  }

  removeThemeAfterChanges(theme: ThemeType): void {
    Object.keys(this.theme).forEach((key: any) => {
      // @ts-ignore
      if (this.theme[key] !== theme) {
        // @ts-ignore
        this.removeUnusedTheme(this.theme[key]);
      }
    });

  }

  public changeTheme(theme: ThemeType): void {
    this.setStoredTheme(theme);
    if (theme === ThemeType.default) {
      this.currentTheme = ThemeType.default ? window.matchMedia('(prefers-color-scheme: dark)').matches ? ThemeType.dark : ThemeType.light : theme;
    } else {
      this.currentTheme = this.theme[theme];
    }
    this.loadTheme(false).then(() => {
    }).catch(console.error);
  }

  public isDarkTheme(): boolean {
    return this.currentTheme === ThemeType.dark;
  }

  public toggleLightDark(): void {
    const next = this.currentTheme === ThemeType.dark ? ThemeType.light : ThemeType.dark;
    this.changeTheme(next);
  }

  loadAppData(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.loadTheme().then(() => {
        this.auth.loadAppData().then(resolve).catch(reject);
      }).catch(() => {
        this.auth.loadAppData().then(resolve).catch(reject);
      });
    })
  }

  getCurrentTheme(): any {
    return this.getStoredTheme();
  }
}
