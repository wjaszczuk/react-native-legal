import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';

import type { LicenseFile } from '../../types';

// `LICEN{S,C}E*` also matches code and data files such as `license.js` or `licenses.json`
const NON_LICENSE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts', '.tsx', '.jsx', '.json', '.map']);

/**
 * Reads every license file (`LICEN{S,C}E*`, `COPYING*`, case-insensitive) from the package root.
 *
 * A file is linked to a License Identifier by its name suffix (e.g. `LICENSE-APACHE` → `Apache-2.0`),
 * but only when exactly one of `licenseIds` matches; otherwise it is listed without an identifier.
 */
export function readLicenseFiles(packageDir: string, licenseIds: string[]): LicenseFile[] {
  return glob
    .sync('{LICEN{S,C}E*,COPYING*}', { cwd: packageDir, absolute: true, nocase: true, nodir: true })
    .sort()
    .filter((file) => !NON_LICENSE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => {
      const licenseId = linkLicenseId(path.basename(file), licenseIds);

      return {
        file,
        content: fs.readFileSync(file, { encoding: 'utf-8' }),
        ...(licenseId && { licenseId }),
      };
    });
}

function linkLicenseId(fileName: string, licenseIds: string[]): string | undefined {
  const suffix = fileName
    .replace(/\.(txt|md)$/i, '')
    .replace(/^(licen[sc]e|copying)[-_. ]*/i, '')
    .toLowerCase();

  if (!suffix) {
    return undefined;
  }

  const matching = licenseIds.filter((id) => {
    const lowerId = id.toLowerCase();

    return lowerId === suffix || lowerId.startsWith(`${suffix}-`);
  });

  return matching.length === 1 ? matching[0] : undefined;
}
