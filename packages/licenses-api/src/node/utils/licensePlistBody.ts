import path from 'path';

import { renderLicenseExpression } from '../../licenses';
import type { License } from '../../types';

/**
 * LicensePlist body: every license text under a per-license heading (plain text, as LicensePlist shows
 * bodies verbatim); the rendered License Expression when there is no text.
 */
export function buildLicensePlistBody(license: License) {
  if (license.licenseFiles.length === 0) {
    return renderLicenseExpression(license.license);
  }

  return license.licenseFiles
    .map(({ file, content, licenseId }) => `=== ${licenseId ?? path.basename(file)} ===\n\n${content.trim()}`)
    .join('\n\n');
}
