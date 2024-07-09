import { API } from 'homebridge';
import { PLUGIN_NAME, PLATFORM_NAME } from './settings';
import { PCControlPlatform as ImportedPCControlPlatform } from './platform';

export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, ImportedPCControlPlatform);
};