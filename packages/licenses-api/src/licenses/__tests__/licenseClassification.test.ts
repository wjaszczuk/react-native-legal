import { STRONG_COPYLEFT_LICENSES, WEAK_COPYLEFT_LICENSES } from '../../constants';
import { LicenseCategory } from '../LicenseCategory';
import { classifyLicenseExpression, classifyUnavoidableCopyleft } from '../licenseClassification';
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

describe('classifyLicenseExpression of copyleft families', () => {
  it.each([
    ['GPL-1.0', LicenseCategory.STRONG_COPYLEFT],
    ['GPL-1.0+', LicenseCategory.STRONG_COPYLEFT],
    ['GPL-1.0-only', LicenseCategory.STRONG_COPYLEFT],
    ['AGPL-1.0', LicenseCategory.STRONG_COPYLEFT],
    ['AGPL-1.0-or-later', LicenseCategory.STRONG_COPYLEFT],
    ['AGPL-3.0', LicenseCategory.STRONG_COPYLEFT],
    ['GPL-3.0+', LicenseCategory.STRONG_COPYLEFT],
    ['GPL-2.0-with-classpath-exception', LicenseCategory.STRONG_COPYLEFT],
    ['LGPL-2.1+', LicenseCategory.WEAK_COPYLEFT],
    ['LGPL-3.0', LicenseCategory.WEAK_COPYLEFT],
    ['GPL', LicenseCategory.UNKNOWN],
    ['LGPL', LicenseCategory.UNKNOWN],
  ])('when the license is %s, then it is %s', (license, expected) => {
    expect(classifyLicenseExpression(parseLicenseExpression(license), 'most-restrictive')).toBe(expected);
  });
});

describe('classifyLicenseExpression of every listed copyleft license', () => {
  const STRONG = [
    'GPL-1.0-only',
    'GPL-1.0-or-later',
    'GPL-2.0-only',
    'GPL-2.0-or-later',
    'GPL-2.0-with-autoconf-exception',
    'GPL-2.0-with-bison-exception',
    'GPL-2.0-with-classpath-exception',
    'GPL-2.0-with-font-exception',
    'GPL-2.0-with-GCC-exception',
    'GPL-3.0-with-autoconf-exception',
    'GPL-3.0-with-GCC-exception',
    'GPL-3.0-only',
    'GPL-3.0-or-later',
    'AGPL-1.0-only',
    'AGPL-1.0-or-later',
    'AGPL-3.0-only',
    'AGPL-3.0-or-later',
    'EUPL-1.0',
    'EUPL-1.1',
    'EUPL-1.2',
    'OSL-1.0',
    'OSL-1.1',
    'OSL-2.0',
    'OSL-2.1',
    'OSL-3.0',
  ];
  const WEAK = [
    'CDDL-1.0',
    'CDDL-1.1',
    'EPL-1.0',
    'EPL-2.0',
    'LGPL-2.0-only',
    'LGPL-2.0-or-later',
    'LGPL-2.1-only',
    'LGPL-2.1-or-later',
    'LGPL-3.0-only',
    'LGPL-3.0-or-later',
    'MPL-1.1',
    'MPL-2.0',
  ];

  it.each(STRONG)('when the license is %s, then it is strong copyleft', (license) => {
    expect(classifyLicenseExpression(parseLicenseExpression(license), 'most-restrictive')).toBe(
      LicenseCategory.STRONG_COPYLEFT,
    );
  });

  it.each(WEAK)('when the license is %s, then it is weak copyleft', (license) => {
    expect(classifyLicenseExpression(parseLicenseExpression(license), 'most-restrictive')).toBe(
      LicenseCategory.WEAK_COPYLEFT,
    );
  });

  it('lists exactly the licenses above, every one of them in canonical form', () => {
    expect([...STRONG_COPYLEFT_LICENSES].sort()).toEqual([...STRONG].sort());
    expect([...WEAK_COPYLEFT_LICENSES].sort()).toEqual([...WEAK].sort());

    // a listed entry that parsing rewrites (deprecated, `+`) could never be matched
    for (const license of [...STRONG, ...WEAK]) {
      expect(parseLicenseExpression(license)).toMatchObject({ kind: 'license', id: license });
    }
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

      expect(classifyUnavoidableCopyleft(expression, 'most-restrictive').category).toBe(mostRestrictiveResult);
      expect(classifyUnavoidableCopyleft(expression, 'least-restrictive').category).toBe(leastRestrictiveResult);
    },
  );

  // unidentified: an Unknown operand could require more than the known category under the OR Policy
  it.each([
    ['MIT', false, false],
    ['MIT OR GPL-3.0-only', false, false],
    ['LGPL-2.1-only', false, false],
    // strong copyleft is already the most restrictive known category
    ['GPL-3.0-only AND LicenseRef-Custom', false, false],
    ['GPL-3.0-only OR LicenseRef-Custom', false, false],
    ['MIT AND LicenseRef-Custom', true, true],
    ['LGPL-2.1-only AND LicenseRef-Custom', true, true],
    // an Unknown operand of OR can only be avoided by choosing the other operand, so only the least restrictive
    // OR Policy lets the known operand settle the result
    ['MIT OR LicenseRef-Custom', true, false],
    ['LGPL-2.1-only OR LicenseRef-Custom', true, false],
    ['(MIT OR LicenseRef-Custom) AND Apache-2.0', true, false],
    ['(MIT OR LicenseRef-Custom) AND LicenseRef-Other', true, true],
    ['LicenseRef-Custom OR LicenseRef-Other', true, true],
    // a wholly Unknown expression may hide copyleft the parser could not read
    ['LicenseRef-Custom', true, true],
    ['UNLICENSED', true, true],
    ['SEE LICENSE IN LICENSE.md', true, true],
    ['GPL-3.0-only OR Foo-1.0', true, true],
  ] satisfies [string, boolean, boolean][])(
    'when raw license is %s, then unidentified is %s under most-restrictive and %s under least-restrictive',
    (rawLicense, mostRestrictiveResult, leastRestrictiveResult) => {
      const expression = parseLicenseExpression(rawLicense);

      expect(classifyUnavoidableCopyleft(expression, 'most-restrictive').unidentified).toBe(mostRestrictiveResult);
      expect(classifyUnavoidableCopyleft(expression, 'least-restrictive').unidentified).toBe(leastRestrictiveResult);
    },
  );

  it('when license is unknown with no raw value, then it requires no known copyleft but is unidentified', () => {
    expect(classifyUnavoidableCopyleft({ kind: 'unknown', raw: null }, 'most-restrictive')).toEqual({
      category: LicenseCategory.PERMISSIVE,
      unidentified: true,
    });
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
      expect(classifyUnavoidableCopyleft(expression, orPolicy).category).toBe(LicenseCategory.STRONG_COPYLEFT);
    }
  });

  it('when such an identifier is one operand of OR, then OR Policy decides as for any strong copyleft', () => {
    const expression = parseLicenseExpression('MIT OR GPL-2.0-with-classpath-exception');

    expect(classifyUnavoidableCopyleft(expression, 'most-restrictive').category).toBe(LicenseCategory.STRONG_COPYLEFT);
    expect(classifyUnavoidableCopyleft(expression, 'least-restrictive').category).toBe(LicenseCategory.PERMISSIVE);
  });
});
