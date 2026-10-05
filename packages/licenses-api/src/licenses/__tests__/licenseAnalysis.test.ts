import { LicenseCategory } from '../LicenseCategory';
import { categorizeLicense } from '../licenseAnalysis';

describe('categorizeLicense', () => {
  it.each([
    [undefined, LicenseCategory.UNKNOWN],
    ['unknown', LicenseCategory.UNKNOWN],
    ['GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT],
    ['gpl-3.0-only', LicenseCategory.STRONG_COPYLEFT],
    ['LGPL-2.1', LicenseCategory.WEAK_COPYLEFT],
    ['MIT', LicenseCategory.PERMISSIVE],
  ])('when input is %s, then expect %s', (input, expectedResult) => {
    expect(categorizeLicense(input)).toEqual(expectedResult);
  });

  it.each([
    ['(MIT OR GPL-3.0)', LicenseCategory.PERMISSIVE],
    ['UNLICENSED', LicenseCategory.PERMISSIVE],
  ])('when input is %s, then expect %s, which is current wrong behavior', (input, expectedResult) => {
    expect(categorizeLicense(input)).toEqual(expectedResult);
  });
});
