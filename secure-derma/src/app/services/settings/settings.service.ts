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
  private readonly preloadableThemes: ThemeType[] = [ThemeType.light, ThemeType.dark];

  getStoredTheme = () => localStorage.getItem('theme')
  setStoredTheme = (theme: any) => localStorage.setItem('theme', theme)

  constructor(
    private auth: AuthService,
  ) {
    const storedTheme: any = this.getStoredTheme();
    if (storedTheme && storedTheme !== 'auto') {
      if (storedTheme === 'coloured') {
        this.currentTheme = ThemeType.dark;
      } else {
        // @ts-ignore
        this.currentTheme = this.theme[storedTheme];
      }
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      const storedTheme = this.getStoredTheme();
      if (storedTheme === 'auto') {
        this.currentTheme = e.matches ? ThemeType.dark : ThemeType.light;
        this.loadTheme(false).then().catch(console.error);
      }
    });
  }

  private resolveThemeAsset(theme: ThemeType): ThemeType {
    return theme === ThemeType.coloured ? ThemeType.dark : theme;
  }

  private getThemeLinkId(theme: ThemeType): string {
    const assetTheme = this.resolveThemeAsset(theme);
    return `theme-${assetTheme}`;
  }

  private setThemeClass(theme: ThemeType): void {
    Object.values(ThemeType).forEach((value) => {
      document.documentElement.classList.remove(value);
    });
    document.documentElement.classList.add(theme);
  }

  private ensureBaseStylesheet(): Promise<Event> {
    return new Promise((resolve, reject) => {
      const linkId = 'theme-base';
      const existingLink = document.getElementById(linkId) as HTMLLinkElement | null;

      if (existingLink) {
        resolve(new Event('load'));
        return;
      }

      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = 'ng-zorro-base.css';
      style.id = linkId;
      style.onload = (event) => resolve(event);
      style.onerror = (event) => reject(event);
      document.head.append(style);
    });
  }

  private ensureThemeStylesheet(theme: ThemeType, active: boolean): Promise<Event> {
    return new Promise((resolve, reject) => {
      const linkId = this.getThemeLinkId(theme);
      const existingLink = document.getElementById(linkId) as HTMLLinkElement | null;

      if (existingLink) {
        existingLink.media = active ? 'all' : 'not all';
        resolve(new Event('load'));
        return;
      }

      const style = document.createElement('link');
      style.rel = 'stylesheet';
      const assetTheme = this.resolveThemeAsset(theme);
      style.href = `${assetTheme}.css`;
      style.id = linkId;
      style.media = active ? 'all' : 'not all';
      style.onload = (event) => resolve(event);
      style.onerror = (event) => reject(event);
      document.head.append(style);
    });
  }

  private preloadAlternateThemes(activeTheme: ThemeType): void {
    const alternateThemes = this.preloadableThemes
      .filter((theme) => theme !== this.resolveThemeAsset(activeTheme));

    alternateThemes.forEach((theme) => {
      this.ensureThemeStylesheet(theme, false).catch(() => undefined);
    });
  }

  public loadTheme(_firstLoad = true): Promise<Event> {
    const theme = this.currentTheme;

    return this.ensureBaseStylesheet().then(() => this.ensureThemeStylesheet(theme, true)).then((event) => {
      this.setThemeClass(theme);
      this.removeThemeAfterChanges(theme);
      this.preloadAlternateThemes(theme);
      return event;
    });
  }

  removeThemeAfterChanges(theme: ThemeType): void {
    this.preloadableThemes.forEach((value) => {
      const link = document.getElementById(this.getThemeLinkId(value)) as HTMLLinkElement | null;
      if (link) {
        link.media = value === theme ? 'all' : 'not all';
      }

      if (value !== theme) {
        document.documentElement.classList.remove(value);
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
