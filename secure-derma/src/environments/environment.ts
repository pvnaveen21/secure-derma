import { runtimeConfig } from '../app/core/runtime-config';

export type AppEnvironment = {
  BASEURL_API: string;
  GOOGLE_CLIENT_ID: string;
  SITE_URL: string;
  DEFAULT_OG_IMAGE: string;
  GOOGLE_SITE_VERIFICATION: string;
};

export const environment: AppEnvironment = {
  BASEURL_API: runtimeConfig.BASEURL_API,
  GOOGLE_CLIENT_ID: runtimeConfig.GOOGLE_CLIENT_ID,
  SITE_URL: runtimeConfig.SITE_URL,
  DEFAULT_OG_IMAGE: runtimeConfig.DEFAULT_OG_IMAGE,
  GOOGLE_SITE_VERIFICATION: runtimeConfig.GOOGLE_SITE_VERIFICATION,
};
