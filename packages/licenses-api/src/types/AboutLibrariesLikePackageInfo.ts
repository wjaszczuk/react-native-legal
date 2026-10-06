import type { AboutLibrariesLibraryJsonPayload } from './AboutLibrariesLibraryJsonPayload';
import type { AboutLibrariesLicenseJsonPayload } from './AboutLibrariesLicenseJsonPayload';

export type AboutLibrariesLikePackageInfo = {
  normalizedPackageNameWithVersion: string;
  libraryJsonPayload: AboutLibrariesLibraryJsonPayload;
  licenseJsonPayloads: AboutLibrariesLicenseJsonPayload[];
};
