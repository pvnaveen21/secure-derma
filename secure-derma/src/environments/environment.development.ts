import { runtimeConfig } from '../app/core/runtime-config';
import type { AppEnvironment } from './environment';

export const environment: AppEnvironment = {
  BASEURL_API: runtimeConfig.BASEURL_API,
  GOOGLE_CLIENT_ID: runtimeConfig.GOOGLE_CLIENT_ID,
  SITE_URL: runtimeConfig.SITE_URL,
  DEFAULT_OG_IMAGE: runtimeConfig.DEFAULT_OG_IMAGE,
  GOOGLE_SITE_VERIFICATION: runtimeConfig.GOOGLE_SITE_VERIFICATION,
};
