import { LicenseCategory } from '../LicenseCategory';
import { categorizeLicense, classifyLicenseExpression, classifyUnavoidableCopyleft } from '../licenseClassification';
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
    // WITH and + classify as the base license
    ['GPL-2.0-only WITH Classpath-exception-2.0', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['LGPL-3.0+', LicenseCategory.WEAK_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    // deprecated identifiers with a built-in License Exception are still strong copyleft
    ['GPL-2.0-with-classpath-exception', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['GPL-3.0-with-GCC-exception', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['GPL-2.0+', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['GPL-2.0', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['Apache-2.0+', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
    // Unknown is the most restrictive category, so it also wins an AND
    ['UNLICENSED', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    ['SEE LICENSE IN LICENSE.md', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    ['NONE', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    ['NOASSERTION', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    // an unrecognised identifier or exception makes the whole expression Unknown
    ['MIT OR Foo-1.0', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    ['GPL-2.0-only WITH Foo-exception', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    // LicenseRef-* parses as a license but is never assumed permissive
    ['LicenseRef-Custom', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    ['DocumentRef-spdx-tool:LicenseRef-Custom', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    ['GPL-3.0-only AND LicenseRef-Custom', LicenseCategory.UNKNOWN, LicenseCategory.UNKNOWN],
    // Unknown is the least restrictive pick only when the other operand is also Unknown or worse
    ['MIT OR LicenseRef-Custom', LicenseCategory.UNKNOWN, LicenseCategory.PERMISSIVE],
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

describe('classifyUnavoidableCopyleft', () => {
  // the result is the copyleft category that must be complied with: permissive, weak or strong copyleft
  it.each([
    ['MIT', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
    ['LGPL-2.1-only', LicenseCategory.WEAK_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    ['GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['GPL-2.0-only WITH Classpath-exception-2.0', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['LGPL-3.0+', LicenseCategory.WEAK_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    // OR follows the OR Policy
    ['MIT OR GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.PERMISSIVE],
    ['LGPL-2.1-only OR GPL-3.0-only', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    // AND always requires the most restrictive operand
    ['MIT AND LGPL-2.1-only', LicenseCategory.WEAK_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    // Unknown operands are ignored, so copyleft next to a custom license cannot be hidden
    ['GPL-3.0-only AND LicenseRef-Custom', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    ['LicenseRef-Custom AND LGPL-2.1-only', LicenseCategory.WEAK_COPYLEFT, LicenseCategory.WEAK_COPYLEFT],
    ['GPL-3.0-only OR LicenseRef-Custom', LicenseCategory.STRONG_COPYLEFT, LicenseCategory.STRONG_COPYLEFT],
    // an expression that is wholly Unknown requires no known copyleft
    ['LicenseRef-Custom', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
    ['UNLICENSED', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
    ['SEE LICENSE IN LICENSE.md', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
    ['MIT OR Foo-1.0', LicenseCategory.PERMISSIVE, LicenseCategory.PERMISSIVE],
  ] satisfies [string, LicenseCategory, LicenseCategory][])(
    'when raw license is %s, then it is %s under most-restrictive and %s under least-restrictive',
    (rawLicense, mostRestrictiveResult, leastRestrictiveResult) => {
      const expression = parseLicenseExpression(rawLicense);

      expect(classifyUnavoidableCopyleft(expression, 'most-restrictive')).toBe(mostRestrictiveResult);
      expect(classifyUnavoidableCopyleft(expression, 'least-restrictive')).toBe(leastRestrictiveResult);
    },
  );

  it('when license is unknown with no raw value, then it requires no known copyleft', () => {
    expect(classifyUnavoidableCopyleft({ kind: 'unknown', raw: null }, 'most-restrictive')).toBe(
      LicenseCategory.PERMISSIVE,
    );
  });
});

describe('deprecated identifiers with a built-in License Exception', () => {
  it.each([
    'GPL-2.0-with-autoconf-exception',
    'GPL-2.0-with-bison-exception',
    'GPL-2.0-with-classpath-exception',
    'GPL-2.0-with-font-exception',
    'GPL-2.0-with-GCC-exception',
    'GPL-3.0-with-autoconf-exception',
    'GPL-3.0-with-GCC-exception',
  ])('when raw license is %s, then it is strong copyleft and copyleft is unavoidable', (rawLicense) => {
    const expression = parseLicenseExpression(rawLicense);

    expect(expression.kind).toBe('license');

    for (const orPolicy of ['most-restrictive', 'least-restrictive'] as const) {
      expect(classifyLicenseExpression(expression, orPolicy)).toBe(LicenseCategory.STRONG_COPYLEFT);
      expect(classifyUnavoidableCopyleft(expression, orPolicy)).toBe(LicenseCategory.STRONG_COPYLEFT);
    }
  });

  it('when such an identifier is one operand of OR, then OR Policy decides as for any strong copyleft', () => {
    const expression = parseLicenseExpression('MIT OR GPL-2.0-with-classpath-exception');

    expect(classifyUnavoidableCopyleft(expression, 'most-restrictive')).toBe(LicenseCategory.STRONG_COPYLEFT);
    expect(classifyUnavoidableCopyleft(expression, 'least-restrictive')).toBe(LicenseCategory.PERMISSIVE);
  });
});
