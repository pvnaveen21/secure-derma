import { runtimeEnvironment } from '../app/core/runtime-env';

export const environment = {
  production: false,
  ...runtimeEnvironment
};
