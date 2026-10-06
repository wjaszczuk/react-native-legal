export type LicenseFile = {
  /** License file path */
  file: string;

  /** License file contents */
  content: string;

  /** License Identifier the file was unambiguously linked to by its name, if any */
  licenseId?: string;
};
