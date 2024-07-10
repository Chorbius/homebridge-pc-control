import { API } from 'homebridge';
import { ACCESSORY_NAME } from './settings';
import { PCControlAccessory } from './accessory';

export default (api: API) => {
  api.registerAccessory(ACCESSORY_NAME, PCControlAccessory);
};