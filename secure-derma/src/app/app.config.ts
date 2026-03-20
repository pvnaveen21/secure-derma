import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { SettingsService } from "@app/services/settings/settings.service";
import { settingsServiceFactory } from "@app/core";
import { NzConfig, provideNzConfig } from 'ng-zorro-antd/core/config';
import { authInterceptor } from './auth/interceptor';

const ngZorroConfig: NzConfig = {
  message: { nzDuration: 5000 },
};
registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideNzI18n(en_US),
    importProvidersFrom(FormsModule),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => settingsServiceFactory(inject(SettingsService))),
    provideNzConfig(ngZorroConfig)
  ]
};
