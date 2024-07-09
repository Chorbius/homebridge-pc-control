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
// import { exec } from 'child_process';  // Remove this line if exec is not needed
import axios from 'axios';
import wol from 'wake_on_lan';

const PLUGIN_NAME = '@chorb/homebridge-pc-control';
const PLATFORM_NAME = 'PCControl';


class PCControlPlatform implements DynamicPlatformPlugin {
  private readonly log: Logger;
  private readonly api: API;
  private readonly config: PlatformConfig;
  private readonly Service: typeof Service;
  private readonly Characteristic: typeof Characteristic;
  private readonly accessories: PlatformAccessory[] = [];

  constructor(log: Logger, config: PlatformConfig, api: API) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      this.addAccessory();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  addAccessory() {
    const uuid = this.api.hap.uuid.generate('homebridge-pc-control-' + (this.config.name || 'PC'));
    let accessory = this.accessories.find((acc: PlatformAccessory) => acc.UUID === uuid);

    if (!accessory) {
      this.log.info('Adding new accessory:', this.config.name || 'PC');
      accessory = new this.api.platformAccessory(this.config.name || 'PC', uuid);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    }

    this.setupAccessoryServices(accessory);
  }

  setupAccessoryServices(accessory: PlatformAccessory) {
    const switchService = accessory.getService(this.Service.Switch) || accessory.addService(this.Service.Switch);

    switchService.getCharacteristic(this.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    if (value as boolean) {
      this.log.info('Turning on PC');
      wol.wake(this.config.macAddress as string, (error: Error | null) => {
        if (error) {
          this.log.error('Failed to wake PC:', error);
        } else {
          this.log.info('Wake-on-LAN packet sent');
        }
      });
    } else {
      this.log.info('Turning off PC');
      try {
        await axios.post(`http://${this.config.ipAddress}:${this.config.port}/shutdown`);
        this.log.info('Shutdown command sent to PC');
      } catch (error) {
        this.log.error('Failed to shutdown PC:', error);
      }
    }
  }

  async getOn(): Promise<boolean> {
    try {
      const response = await axios.get(`http://${this.config.ipAddress}:${this.config.port}/status`);
      return response.data.isOn;
    } catch (error) {
      this.log.error('Failed to get PC status:', error);
      return false;
    }
  }
}

export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PCControlPlatform);
};