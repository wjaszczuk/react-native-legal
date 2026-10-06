import { LicenseCategory } from '../LicenseCategory';
import { categorizeLicense, classifyLicenseExpression } from '../licenseClassification';
import { parseLicenseExpression } from '../licenseExpression';

describe('classifyLicenseExpression', () => {
  it.each([
    ['MIT', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
    ['LGPL-2.1-only', LicenseCategory.WEAK_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    ['GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['MIT OR Apache-2.0', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
    ['MIT OR GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.PERMISSIVE],
    ['LGPL-2.1-only OR GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    // AND takes the most restrictive operand regardless of the OR Policy
    ['MIT AND LGPL-2.1-only', LicenseCategory.WEAK_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    ['LGPL-2.1-only AND GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    // AND binds tighter than OR: MIT OR (Apache-2.0 AND GPL-3.0-only)
    ['MIT OR Apache-2.0 AND GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.PERMISSIVE],
    // the OR Policy applies to an OR nested inside AND
    ['(MIT OR GPL-3.0-only) AND LGPL-2.1-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    // the OR Policy applies to every OR in a chain
    ['GPL-3.0-only OR LGPL-2.1-only OR MIT', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.PERMISSIVE],
    // the OR Policy applies to an OR nested inside OR
    ['(GPL-3.0-only OR MIT) OR LGPL-2.1-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.PERMISSIVE],
    ['MIT AND OR Apache-2.0', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
  ] satisfies [string, LicenseCategory, LicenseCategory][])(
    'when raw license is %s, then it is %s under most-restrictive and %s under least-restrictive',
    (rawLicense, mostRestrictiveCategory, leastRestrictiveCategory) => {
      const expression = parseLicenseExpression(rawLicense);

      expect(classifyLicenseExpression(expression, 'most-restrictive')).toBe(mostRestrictiveCategory);
      expect(classifyLicenseExpression(expression, 'least-restrictive')).toBe(leastRestrictiveCategory);
    },
  );

  it('when license is unknown with no raw value, then it is unknown under every OR Policy', () => {
    expect(classifyLicenseExpression({ kind: 'unknown', raw: null }, 'most-restrictive')).toBe(LicenseCategory.UNKNOWN);
    expect(classifyLicenseExpression({ kind: 'unknown', raw: null }, 'least-restrictive')).toBe(
      LicenseCategory.UNKNOWN,
    );
  });

  it('when no OR Policy is given, then it takes the most restrictive operand of a Dual License', () => {
    expect(classifyLicenseExpression(parseLicenseExpression('MIT OR GPL-3.0-only'))).toBe(
      LicenseCategory.STRONG_COPYLEFT,
    );
  });
});

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
