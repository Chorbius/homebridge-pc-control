import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import axios from 'axios';
import wol from 'wake_on_lan';
import { PCControlPlatform } from './platform';

export class PCControlAccessory {
  private service: Service;

  constructor(
    private readonly platform: PCControlPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Custom Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Custom Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Custom Serial');

    // get the Switch service if it exists, otherwise create a new Switch service
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a switch.
   */
  async setOn(value: CharacteristicValue) {
    const log = this.platform.log;
    const config = this.platform.config;

    if (value as boolean) {
      log.info('Turning on PC');
      wol.wake(config.macAddress as string, (error: Error | null) => {
        if (error) {
          log.error('Failed to wake PC:', error);
        } else {
          log.info('Wake-on-LAN packet sent');
        }
      });
    } else {
      log.info('Turning off PC');
      try {
        await axios.post(`http://${config.ipAddress}:${config.port}/shutdown`);
        log.info('Shutdown command sent to PC');
      } catch (error) {
        log.error('Failed to shutdown PC:', error);
      }
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a switch is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.
   */
  async getOn(): Promise<CharacteristicValue> {
    const log = this.platform.log;
    const config = this.platform.config;

    try {
      const response = await axios.get(`http://${config.ipAddress}:${config.port}/status`);
      const isOn = response.data.isOn;
      log.debug('Get Characteristic On ->', isOn);
      return isOn;
    } catch (error) {
      log.error('Failed to get PC status:', error);
      return false;
    }
  }
}
