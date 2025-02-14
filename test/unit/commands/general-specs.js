import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import AndroidDriver from '../../../lib/driver';
import helpers from '../../../lib/android-helpers';
import { withMocks } from '@appium/test-support';
import { fs } from 'appium/support';
import Bootstrap from '../../../lib/bootstrap';
import B from 'bluebird';
import ADB from 'appium-adb';


chai.should();
chai.use(chaiAsPromised);

let driver;
let sandbox = sinon.createSandbox();
let expect = chai.expect;

describe('General', function () {
  beforeEach(function () {
    driver = new AndroidDriver();
    driver.bootstrap = new Bootstrap();
    driver.adb = new ADB();
    driver.caps = {};
    driver.opts = {};
  });
  afterEach(function () {
    sandbox.restore();
  });
  describe('keys', function () {
    it('should send keys via setText bootstrap command', async function () {
      sandbox.stub(driver.bootstrap, 'sendAction');
      driver.opts.unicodeKeyboard = true;
      await driver.keys('keys');
      driver.bootstrap.sendAction
        .calledWithExactly('setText',
          {text: 'keys', replace: false, unicodeKeyboard: true})
        .should.be.true;
    });
    it('should join keys if keys is array', async function () {
      sandbox.stub(driver.bootstrap, 'sendAction');
      driver.opts.unicodeKeyboard = false;
      await driver.keys(['k', 'e', 'y', 's']);
      driver.bootstrap.sendAction
        .calledWithExactly('setText', {text: 'keys', replace: false})
        .should.be.true;
    });
  });
  describe('getDeviceTime', function () {
    it('should return device time', async function () {
      sandbox.stub(driver.adb, 'shell');
      driver.adb.shell.returns(' 2018-06-09T16:21:54+0900 ');
      await driver.getDeviceTime().should.become('2018-06-09T16:21:54+09:00');
      driver.adb.shell.calledWithExactly(['date', '+%Y-%m-%dT%T%z']).should.be.true;
    });
    it('should return device time with custom format', async function () {
      sandbox.stub(driver.adb, 'shell');
      driver.adb.shell.returns(' 2018-06-09T16:21:54+0900 ');
      await driver.getDeviceTime('YYYY-MM-DD').should.become('2018-06-09');
      driver.adb.shell.calledWithExactly(['date', '+%Y-%m-%dT%T%z']).should.be.true;
    });
    it('should throw error if shell command failed', async function () {
      sandbox.stub(driver.adb, 'shell').throws();
      await driver.getDeviceTime().should.be.rejected;
    });
  });
  describe('getPageSource', function () {
    it('should return page source', async function () {
      sandbox.stub(driver.bootstrap, 'sendAction').withArgs('source').returns('sources');
      (await driver.getPageSource()).should.be.equal('sources');
    });
  });
  describe('back', function () {
    it('should press back', async function () {
      sandbox.stub(driver.bootstrap, 'sendAction');
      await driver.back();
      driver.bootstrap.sendAction.calledWithExactly('pressBack').should.be.true;
    });
  });
  describe('isKeyboardShown', function () {
    it('should return true if the keyboard is shown', async function () {
      driver.adb.isSoftKeyboardPresent = function isSoftKeyboardPresent () {
        return {isKeyboardShown: true, canCloseKeyboard: true};
      };
      (await driver.isKeyboardShown()).should.equal(true);
    });
    it('should return false if the keyboard is not shown', async function () {
      driver.adb.isSoftKeyboardPresent = function isSoftKeyboardPresent () {
        return {isKeyboardShown: false, canCloseKeyboard: true};
      };
      (await driver.isKeyboardShown()).should.equal(false);
    });
  });
  describe('hideKeyboard', function () {
    it('should hide keyboard with ESC command', async function () {
      sandbox.stub(driver.adb, 'keyevent');
      let callIdx = 0;
      driver.adb.isSoftKeyboardPresent = function isSoftKeyboardPresent () {
        callIdx++;
        return {
          isKeyboardShown: callIdx <= 1,
          canCloseKeyboard: callIdx <= 1,
        };
      };
      await driver.hideKeyboard().should.eventually.be.fulfilled;
      driver.adb.keyevent.calledWithExactly(111).should.be.true;
    });
    it('should throw if cannot close keyboard', async function () {
      this.timeout(10000);
      sandbox.stub(driver.adb, 'keyevent');
      driver.adb.isSoftKeyboardPresent = function isSoftKeyboardPresent () {
        return {
          isKeyboardShown: true,
          canCloseKeyboard: false,
        };
      };
      await driver.hideKeyboard().should.eventually.be.rejected;
      driver.adb.keyevent.notCalled.should.be.true;
    });
    it('should not throw if no keyboard is present', async function () {
      driver.adb.isSoftKeyboardPresent = function isSoftKeyboardPresent () {
        return {
          isKeyboardShown: false,
          canCloseKeyboard: false,
        };
      };
      await driver.hideKeyboard().should.eventually.be.fulfilled;
    });
  });
  describe('openSettingsActivity', function () {
    it('should open settings activity', async function () {
      sandbox.stub(driver.adb, 'getFocusedPackageAndActivity')
        .returns({appPackage: 'pkg', appActivity: 'act'});
      sandbox.stub(driver.adb, 'shell');
      sandbox.stub(driver.adb, 'waitForNotActivity');
      await driver.openSettingsActivity('set1');
      driver.adb.shell.calledWithExactly(['am', 'start', '-a', 'android.settings.set1'])
        .should.be.true;
      driver.adb.waitForNotActivity.calledWithExactly('pkg', 'act', 5000)
        .should.be.true;
    });
  });
  describe('getWindowSize', function () {
    it('should get window size', async function () {
      sandbox.stub(driver.bootstrap, 'sendAction')
        .withArgs('getDeviceSize').returns('size');
      (await driver.getWindowSize()).should.be.equal('size');
    });
  });
  describe('getWindowRect', function () {
    it('should get window size', async function () {
      sandbox.stub(driver.bootstrap, 'sendAction')
        .withArgs('getDeviceSize').returns({width: 300, height: 400});
      const rect = await driver.getWindowRect();
      rect.width.should.be.equal(300);
      rect.height.should.be.equal(400);
      rect.x.should.be.equal(0);
      rect.y.should.be.equal(0);
    });
  });
  describe('getCurrentActivity', function () {
    it('should get current activity', async function () {
      sandbox.stub(driver.adb, 'getFocusedPackageAndActivity')
        .returns({appActivity: 'act'});
      await driver.getCurrentActivity().should.eventually.be.equal('act');
    });
  });
  describe('getCurrentPackage', function () {
    it('should get current activity', async function () {
      sandbox.stub(driver.adb, 'getFocusedPackageAndActivity')
        .returns({appPackage: 'pkg'});
      await driver.getCurrentPackage().should.eventually.equal('pkg');
    });
  });
  describe('isAppInstalled', function () {
    it('should return true if app is installed', async function () {
      sandbox.stub(driver.adb, 'isAppInstalled').withArgs('pkg').returns(true);
      (await driver.isAppInstalled('pkg')).should.be.true;
    });
  });
  describe('removeApp', function () {
    it('should remove app', async function () {
      sandbox.stub(driver.adb, 'uninstallApk').withArgs('pkg').returns(true);
      (await driver.removeApp('pkg')).should.be.true;
    });
  });
  describe('installApp', function () {
    it('should install app', async function () {
      let app = 'app.apk';
      sandbox.stub(driver.helpers, 'configureApp').withArgs(app, '.apk')
        .returns(app);
      sandbox.stub(fs, 'rimraf').returns();
      sandbox.stub(driver.adb, 'install').returns(true);
      await driver.installApp(app);
      driver.helpers.configureApp.calledOnce.should.be.true;
      fs.rimraf.notCalled.should.be.true;
      driver.adb.install.calledOnce.should.be.true;
    });
    it('should throw an error if APK does not exist', async function () {
      await driver.installApp('non/existent/app.apk').should.be
        .rejectedWith(/does not exist or is not accessible/);
    });
  });
  describe('background', function () {
    it('should bring app to background and back', async function () {
      const appPackage = 'wpkg';
      const appActivity = 'wacv';
      driver.opts = {appPackage, appActivity, intentAction: 'act',
                     intentCategory: 'cat', intentFlags: 'flgs',
                     optionalIntentArguments: 'opt'};
      sandbox.stub(driver.adb, 'goToHome');
      sandbox.stub(driver.adb, 'getFocusedPackageAndActivity')
        .returns({appPackage, appActivity});
      sandbox.stub(B, 'delay');
      sandbox.stub(driver.adb, 'startApp');
      sandbox.stub(driver, 'activateApp');
      await driver.background(10);
      driver.adb.getFocusedPackageAndActivity.calledOnce.should.be.true;
      driver.adb.goToHome.calledOnce.should.be.true;
      B.delay.calledWithExactly(10000).should.be.true;
      driver.activateApp.calledWithExactly(appPackage).should.be.true;
      driver.adb.startApp.notCalled.should.be.true;
    });
    it('should bring app to background and back if started after session init', async function () {
      const appPackage = 'newpkg';
      const appActivity = 'newacv';
      driver.opts = {appPackage: 'pkg', appActivity: 'acv', intentAction: 'act',
                     intentCategory: 'cat', intentFlags: 'flgs',
                     optionalIntentArguments: 'opt'};
      let params = {pkg: appPackage, activity: appActivity, action: 'act', category: 'cat',
                    flags: 'flgs', waitPkg: 'wpkg', waitActivity: 'wacv',
                    optionalIntentArguments: 'opt', stopApp: false};
      driver._cachedActivityArgs = {[`${appPackage}/${appActivity}`]: params};
      sandbox.stub(driver.adb, 'goToHome');
      sandbox.stub(driver.adb, 'getFocusedPackageAndActivity')
        .returns({appPackage, appActivity});
      sandbox.stub(B, 'delay');
      sandbox.stub(driver.adb, 'startApp');
      sandbox.stub(driver, 'activateApp');
      await driver.background(10);
      driver.adb.getFocusedPackageAndActivity.calledOnce.should.be.true;
      driver.adb.goToHome.calledOnce.should.be.true;
      B.delay.calledWithExactly(10000).should.be.true;
      driver.adb.startApp.calledWithExactly(params).should.be.true;
      driver.activateApp.notCalled.should.be.true;
    });
    it('should bring app to background and back if waiting for other pkg / activity', async function () { //eslint-disable-line
      const appPackage = 'somepkg';
      const appActivity = 'someacv';
      const appWaitPackage = 'somewaitpkg';
      const appWaitActivity = 'somewaitacv';
      driver.opts = {appPackage, appActivity, appWaitPackage, appWaitActivity,
                     intentAction: 'act', intentCategory: 'cat',
                     intentFlags: 'flgs', optionalIntentArguments: 'opt',
                     stopApp: false};
      sandbox.stub(driver.adb, 'goToHome');
      sandbox.stub(driver.adb, 'getFocusedPackageAndActivity')
        .returns({appPackage: appWaitPackage, appActivity: appWaitActivity});
      sandbox.stub(B, 'delay');
      sandbox.stub(driver.adb, 'startApp');
      sandbox.stub(driver, 'activateApp');
      await driver.background(10);
      driver.adb.getFocusedPackageAndActivity.calledOnce.should.be.true;
      driver.adb.goToHome.calledOnce.should.be.true;
      B.delay.calledWithExactly(10000).should.be.true;
      driver.activateApp.calledWithExactly(appWaitPackage).should.be.true;
      driver.adb.startApp.notCalled.should.be.true;
    });
    it('should not bring app back if seconds are negative', async function () {
      sandbox.stub(driver.adb, 'goToHome');
      sandbox.stub(driver.adb, 'startApp');
      await driver.background(-1);
      driver.adb.goToHome.calledOnce.should.be.true;
      driver.adb.startApp.notCalled.should.be.true;
    });
  });
  describe('getStrings', withMocks({helpers}, (mocks) => {
    it('should return app strings', async function () {
      driver.bootstrap.sendAction = () => '';
      mocks.helpers.expects('pushStrings')
          .returns({test: 'en_value'});
      let strings = await driver.getStrings('en');
      strings.test.should.equal('en_value');
      mocks.helpers.verify();
    });
    it('should return cached app strings for the specified language', async function () {
      driver.adb.getDeviceLanguage = () => 'en';
      driver.apkStrings.en = {test: 'en_value'};
      driver.apkStrings.fr = {test: 'fr_value'};
      let strings = await driver.getStrings('fr');
      strings.test.should.equal('fr_value');
    });
    it('should return cached app strings for the device language', async function () {
      driver.adb.getDeviceLanguage = () => 'en';
      driver.apkStrings.en = {test: 'en_value'};
      driver.apkStrings.fr = {test: 'fr_value'};
      let strings = await driver.getStrings();
      strings.test.should.equal('en_value');
    });
  }));
  describe('launchApp', function () {
    it('should init and start app', async function () {
      sandbox.stub(driver, 'initAUT');
      sandbox.stub(driver, 'startAUT');
      await driver.launchApp();
      driver.initAUT.calledOnce.should.be.true;
      driver.startAUT.calledOnce.should.be.true;
    });
  });
  describe('startActivity', function () {
    let params;
    beforeEach(function () {
      params = {pkg: 'pkg', activity: 'act', waitPkg: 'wpkg', waitActivity: 'wact',
                action: 'act', category: 'cat', flags: 'flgs', optionalIntentArguments: 'opt'};
      sandbox.stub(driver.adb, 'startApp');
    });
    it('should start activity', async function () {
      params.optionalIntentArguments = 'opt';
      params.stopApp = false;
      await driver.startActivity('pkg', 'act', 'wpkg', 'wact', 'act',
        'cat', 'flgs', 'opt', true);
      driver.adb.startApp.calledWithExactly(params).should.be.true;
    });
    it('should use dontStopAppOnReset from opts if it is not passed as param', async function () {
      driver.opts.dontStopAppOnReset = true;
      params.stopApp = false;
      await driver.startActivity('pkg', 'act', 'wpkg', 'wact', 'act', 'cat', 'flgs', 'opt');
      driver.adb.startApp.calledWithExactly(params).should.be.true;
    });
    it('should use appPackage and appActivity if appWaitPackage and appWaitActivity are undefined', async function () {
      params.waitPkg = 'pkg';
      params.waitActivity = 'act';
      params.stopApp = true;
      await driver.startActivity('pkg', 'act', null, null, 'act', 'cat', 'flgs', 'opt', false);
      driver.adb.startApp.calledWithExactly(params).should.be.true;
    });
  });
  describe('reset', function () {
    it('should reset app via reinstall if fullReset is true', async function () {
      driver.opts.fullReset = true;
      driver.opts.appPackage = 'pkg';
      sandbox.stub(driver, 'startAUT').returns('aut');
      sandbox.stub(helpers, 'resetApp').returns(undefined);
      await driver.reset().should.eventually.be.equal('aut');
      helpers.resetApp.calledWith(driver.adb).should.be.true;
      driver.startAUT.calledOnce.should.be.true;
    });
    it('should do fast reset if fullReset is false', async function () {
      driver.opts.fullReset = false;
      driver.opts.appPackage = 'pkg';
      sandbox.stub(helpers, 'resetApp').returns(undefined);
      sandbox.stub(driver, 'startAUT').returns('aut');
      await driver.reset().should.eventually.be.equal('aut');
      helpers.resetApp.calledWith(driver.adb).should.be.true;
      driver.startAUT.calledOnce.should.be.true;
      expect(driver.curContext).to.eql('NATIVE_APP');
    });
  });
  describe('startAUT', function () {
    it('should start AUT', async function () {
      driver.opts = {
        appPackage: 'pkg',
        appActivity: 'act',
        intentAction: 'actn',
        intentCategory: 'cat',
        intentFlags: 'flgs',
        appWaitPackage: 'wpkg',
        appWaitActivity: 'wact',
        appWaitForLaunch: true,
        appWaitDuration: 'wdur',
        optionalIntentArguments: 'opt',
        userProfile: 1
      };
      let params = {
        pkg: 'pkg',
        activity: 'act',
        action: 'actn',
        category: 'cat',
        flags: 'flgs',
        waitPkg: 'wpkg',
        waitActivity: 'wact',
        waitForLaunch: true,
        waitDuration: 'wdur',
        optionalIntentArguments: 'opt',
        stopApp: false,
        user: 1
      };
      driver.opts.dontStopAppOnReset = true;
      params.stopApp = false;
      sandbox.stub(driver.adb, 'startApp');
      await driver.startAUT();
      driver.adb.startApp.calledWithExactly(params).should.be.true;
    });
  });
  describe('setUrl', function () {
    it('should set url', async function () {
      driver.opts = {appPackage: 'pkg'};
      sandbox.stub(driver.adb, 'startUri');
      await driver.setUrl('url');
      driver.adb.startUri.calledWithExactly('url', 'pkg').should.be.true;
    });
  });
  describe('closeApp', function () {
    it('should close app', async function () {
      driver.opts = {appPackage: 'pkg'};
      sandbox.stub(driver.adb, 'forceStop');
      await driver.closeApp();
      driver.adb.forceStop.calledWithExactly('pkg').should.be.true;
    });
  });
  describe('getDisplayDensity', function () {
    it('should return the display density of a device', async function () {
      driver.adb.shell = () => '123';
      (await driver.getDisplayDensity()).should.equal(123);
    });
    it('should return the display density of an emulator', async function () {
      driver.adb.shell = (cmd) => {
        let joinedCmd = cmd.join(' ');
        if (joinedCmd.indexOf('ro.sf') !== -1) {
          // device property look up
          return '';
        } else if (joinedCmd.indexOf('qemu.sf') !== -1) {
          // emulator property look up
          return '456';
        }
        return '';
      };
      (await driver.getDisplayDensity()).should.equal(456);
    });
    it('should throw an error if the display density property can\'t be found', async function () {
      driver.adb.shell = () => '';
      await driver.getDisplayDensity().should.be.rejectedWith(/Failed to get display density property/);
    });
    it('should throw and error if the display density is not a number', async function () {
      driver.adb.shell = () => 'abc';
      await driver.getDisplayDensity().should.be.rejectedWith(/Failed to get display density property/);
    });
  });
});
