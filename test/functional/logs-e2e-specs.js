import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { AndroidDriver } from '../../lib/driver';
import { util } from 'appium/support';
import { DEFAULT_CAPS, amendCapabilities } from './capabilities';
import WebSocket from 'ws';
import B from 'bluebird';


chai.should();
chai.use(chaiAsPromised);

const HOST = util.localIp();
const PORT = 4723;

const caps = amendCapabilities(DEFAULT_CAPS, {
  'appium:androidInstallTimeout': 90000
});

describe('logs', function () {
  let driver;

  before(async function () {
    driver = new AndroidDriver();
    await driver.createSession(caps);
  });
  after(async function () {
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should be able to receieve logcat output via web socket', async function () {
    const endpoint = `/ws/session/${driver.sessionId}/appium/device/logcat`;
    const timeout = 200;
    const logsPromise = new B((resolve, reject) => {
      const client = new WebSocket(`ws://${HOST}:${PORT}${endpoint}`);
      client.on('message', (data) => {
        data.should.not.be.empty;
        resolve();
      });
      client.on('error', reject);
    });

    await driver.execute('mobile: startLogsBroadcast', {});
    try {
      // do something that ought to produce some logs
      await driver.startActivity('io.appium.android.apis', 'io.appium.android.apis.ApiDemos');
      // wait for data, or a timeout
      await logsPromise.timeout(timeout, 'No websocket messages have been received after the timeout');
    } finally {
      await driver.execute('mobile: stopLogsBroadcast', {});
    }
  });
});
