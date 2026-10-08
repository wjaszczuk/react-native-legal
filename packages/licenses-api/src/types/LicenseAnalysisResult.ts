import type { LicenseCategory } from '../licenses/LicenseCategory';

import type { LicenseStats } from './LicenseStats';

export interface LicenseAnalysisResult extends LicenseStats {
  /**
   * Mapping of package key (`<package-name>@<package-version>`) to the License Category of that package
   */
  categorizedLicenses: Record<string, LicenseCategory>;

  /**
   * Mapping of rendered License Expression to its License Category; has the same keys as {@link LicenseStats.byLicense}
   */
  categoryByLicense: Record<string, LicenseCategory>;
}
