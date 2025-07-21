// @ts-check
import { platformIOS } from '@rnef/platform-ios';
import { platformAndroid } from '@rnef/platform-android';
import { providerGitHub } from '@rnef/provider-github';
import { pluginMetro } from '@rnef/plugin-metro';
import 'dotenv/config';

/** @type {import('@rnef/cli').Config} */
export default {
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS(),
    android: platformAndroid(),
  },
  remoteCacheProvider: !hasGithubConfig()
    ? null
    : providerGitHub({
        owner: process.env.GITHUB_REPOSITORY_OWNER,
        repository: process.env.GITHUB_REPOSITORY_NAME,
        token: process.env.GITHUB_TOKEN,
      }),
};

function hasGithubConfig() {
  return (
    process.env.GITHUB_REPOSITORY_OWNER != null &&
    process.env.GITHUB_REPOSITORY_NAME != null &&
    process.env.GITHUB_TOKEN != null
  );
}
