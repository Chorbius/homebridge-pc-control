import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, CharacteristicValue } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import axios from 'axios';
import wol from 'wake_on_lan';

export class PCControlPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const device = {
      uniqueId: 'PC-Control',
      displayName: this.config.name || 'My PC',
      macAddress: this.config.macAddress,
      ipAddress: this.config.ipAddress,
      port: this.config.port,
    };

    const uuid = this.api.hap.uuid.generate(device.uniqueId);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      existingAccessory.context.device = device;
      this.api.updatePlatformAccessories([existingAccessory]);
      new PCControlAccessory(this, existingAccessory);
    } else {
      this.log.info('Adding new accessory:', device.displayName);
      const accessory = new this.api.platformAccessory(device.displayName, uuid);
      accessory.context.device = device;
      new PCControlAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}

class PCControlAccessory {
  private service: Service;

  constructor(
    private readonly platform: PCControlPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    const device = this.accessory.context.device;

    if (value as boolean) {
      this.platform.log.info('Turning on PC');
      wol.wake(device.macAddress, (error) => {
        if (error) {
          this.platform.log.error('Failed to wake PC:', error);
        } else {
          this.platform.log.info('Wake-on-LAN packet sent');
        }
      });
    } else {
      this.platform.log.info('Turning off PC');
      try {
        await axios.post(`http://${device.ipAddress}:${device.port}/shutdown`);
        this.platform.log.info('Shutdown command sent to PC');
      } catch (error) {
        this.platform.log.error('Failed to shutdown PC:', error);
      }
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    const device = this.accessory.context.device;

    try {
      const response = await axios.get(`http://${device.ipAddress}:${device.port}/status`);
      return response.data.isOn;
    } catch (error) {
      this.platform.log.error('Failed to get PC status:', error);
      return false;
    }
  }
}