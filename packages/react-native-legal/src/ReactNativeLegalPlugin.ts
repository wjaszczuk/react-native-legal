import type { PluginApi, PluginOutput } from '@rnef/config';

const PLUGIN_NAME = 'legal-generate';
const PLUGIN_DESCRIPTION = 'Set up all native boilerplate for OSS licenses notice';

export function pluginReactNativeLegal() {
  return (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: PLUGIN_NAME,
      description: PLUGIN_DESCRIPTION,
      action: async () => {
        console.log('hello world');
      },
    });

    return {
      name: PLUGIN_NAME,
      description: PLUGIN_DESCRIPTION,
    };
  };
}
