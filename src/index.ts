import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  CharacteristicValue,
} from 'homebridge';
import axios from 'axios';
import wol from 'wake_on_lan';
import { PLUGIN_NAME, PLATFORM_NAME } from './settings';
import { PCControlPlatform } from './platform';

export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PCControlPlatform);
};