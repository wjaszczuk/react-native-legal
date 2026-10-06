import type { DependencyType } from './DependencyType';
import type { LicenseExpression } from './LicenseExpression';
import type { LicenseFile } from './LicenseFile';
import type { ParentPackageInfo } from './ParentPackageInfo';
import type { ScanPackageCallContext } from './ScanPackageCallContext';

export type License = {
  /** Package name */
  name: string;

  /** Package author */
  author?: string;

  /** Package license contents */
  content?: string;

  /** Package description */
  description?: string;

  /** License file path */
  file?: string;

  /**
   * License type
   *
   * @deprecated Use {@link License.rawLicense}, {@link License.license} or {@link License.licenseIds} instead
   */
  type?: string;

  /**
   * Raw License: the license declaration exactly as written in package.json;
   * for the legacy `licenses: [{ type }]` array, the types joined with ` OR `;
   * `null` if the package declares no license
   */
  rawLicense: string | null;

  /** Parsed License Expression of {@link License.rawLicense} */
  license: LicenseExpression;

  /** Canonical SPDX License Identifiers found in {@link License.license}; empty for an Unknown License */
  licenseIds: string[];

  /** Every license file found in the package root, each linked to its License Identifier where unambiguous */
  licenseFiles: LicenseFile[];

  /** Package repository URL */
  url?: string;

  /** The resolved version that was actually installed */
  version: string;

  /** The source of how this package has been introduced to the dependency tree */
  dependencyType: DependencyType;

  /** The required version specified in package.json */
  requiredVersion: string;

  /**
   * The name(s) of the package(s) that introduced the package as a dependency (of any type);
   * empty array if the package is a dependency of the root package
   */
  parentPackages: ParentPackageInfo[];
} & Pick<ScanPackageCallContext, 'parentPackageRequiredVersion' | 'parentPackageResolvedVersion'>;
