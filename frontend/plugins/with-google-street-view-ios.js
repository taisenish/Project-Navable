const { createRunOncePlugin, withInfoPlist } = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-google-street-view-ios';
const PLUGIN_VERSION = '1.0.0';

function withGoogleStreetViewIOS(config) {
  return withInfoPlist(config, (configWithInfoPlist) => {
    const keyFromEnv = process.env.GOOGLE_MAPS_IOS_API_KEY || '';

    if (keyFromEnv && typeof keyFromEnv === 'string') {
      configWithInfoPlist.modResults.GMSApiKey = keyFromEnv;
    }

    return configWithInfoPlist;
  });
}

module.exports = createRunOncePlugin(withGoogleStreetViewIOS, PLUGIN_NAME, PLUGIN_VERSION);
