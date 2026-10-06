import type { Types } from '@callstack/licenses';
import { renderLicenseExpression } from '@callstack/licenses';

/**
 * Renders the License Expression of a package for display.
 * An Unknown License is shown with its Raw License, or as `(unknown)` when the package declares none.
 */
export function renderDisplayLicense(license: Pick<Types.License, 'license'>): string {
  const { license: expression } = license;

  if (expression.kind === 'unknown') {
    return expression.raw ? `Unknown (${expression.raw})` : '(unknown)';
  }

  return renderLicenseExpression(expression);
}
