import { AccessoryPlugin, CharacteristicValue, Logging, Service, AccessoryConfig, API } from 'homebridge';
import axios from 'axios';
import wol from 'wake_on_lan';

export class PCControlAccessory implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly macAddress: string;
  private readonly ipAddress: string;
  private readonly port: number;

  private readonly switchService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name as string || 'Default Name';
    this.macAddress = config.macAddress;
    this.ipAddress = config.ipAddress;
    this.port = config.port;

    this.switchService = new api.hap.Service.Switch(this.name);
    this.switchService.getCharacteristic(api.hap.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.informationService = new api.hap.Service.AccessoryInformation()
      .setCharacteristic(api.hap.Characteristic.Manufacturer, 'Custom Manufacturer')
      .setCharacteristic(api.hap.Characteristic.Model, 'Custom Model');

    log.info('PC Control Accessory finished initializing!');
  }

  async setOn(value: CharacteristicValue) {
    if (value as boolean) {
      this.log.info('Turning on PC');
      wol.wake(this.macAddress, (error) => {
        if (error) {
          this.log.error('Failed to wake PC:', error);
        } else {
          this.log.info('Wake-on-LAN packet sent');
        }
      });
    } else {
      this.log.info('Turning off PC');
      try {
        await axios.post(`http://${this.ipAddress}:${this.port}/shutdown`);
        this.log.info('Shutdown command sent to PC');
      } catch (error) {
        this.log.error('Failed to shutdown PC:', error);
      }
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    try {
      const response = await axios.get(`http://${this.ipAddress}:${this.port}/status`);
      return response.data.isOn;
    } catch (error) {
      this.log.error('Failed to get PC status:', error);
      return false;
    }
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }
}