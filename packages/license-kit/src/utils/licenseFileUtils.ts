import type { Types } from '@callstack/licenses';

/** Comma-separated list of the files a package's licenses were read from */
export function formatLicenseFileNames(licenseFiles: Types.License['licenseFiles']): string {
  return licenseFiles.map(({ file }) => file).join(', ');
}
