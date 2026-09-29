import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { I18nService } from './i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Load the UI dictionary (system language or the user's choice) before the first render.
    provideAppInitializer(() => inject(I18nService).init()),
  ],
};
