import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Without this, navigating to a URL identical to the current one (e.g. re-picking
    // the already-active session from the navbar list) is silently ignored.
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
  ],
};
