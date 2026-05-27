const { createRunOncePlugin, withEntitlementsPlist } = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-strip-aps-environment';
const PLUGIN_VERSION = '1.0.0';

function withStripApsEnvironment(config) {
  return withEntitlementsPlist(config, (configWithEntitlements) => {
    // Delete push notifications entitlement for personal developer accounts
    delete configWithEntitlements.modResults['aps-environment'];
    return configWithEntitlements;
  });
}

module.exports = createRunOncePlugin(withStripApsEnvironment, PLUGIN_NAME, PLUGIN_VERSION);
