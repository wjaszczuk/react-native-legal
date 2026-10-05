import type { LicenseExpression } from '../../types';
import { collectLicenseIds, parseLicenseExpression, renderLicenseExpression } from '../licenseExpression';

describe('parseLicenseExpression', () => {
  it('when raw license is null, then it returns kind unknown, and raw null', () => {
    expect(parseLicenseExpression(null)).toEqual({ kind: 'unknown', raw: null });
  });

  it('when raw license is an unknown license string, it returns kind unknown, and this license as a raw field', () => {
    expect(parseLicenseExpression('This is invalid license field')).toEqual({
      kind: 'unknown',
      raw: 'This is invalid license field',
    });
  });

  it.each([
    ['MIT', { kind: 'license', id: 'MIT' }],
    [
      'MIT OR Apache-2.0',
      { kind: 'or', left: { kind: 'license', id: 'MIT' }, right: { kind: 'license', id: 'Apache-2.0' } },
    ],
    [
      'MIT AND LGPL-2.1-only',
      { kind: 'and', left: { kind: 'license', id: 'MIT' }, right: { kind: 'license', id: 'LGPL-2.1-only' } },
    ],
    // AND binds tighter than OR (SPDX spec, Annex B.3.4)
    [
      'MIT OR Apache-2.0 AND ISC',
      {
        kind: 'or',
        left: { kind: 'license', id: 'MIT' },
        right: { kind: 'and', left: { kind: 'license', id: 'Apache-2.0' }, right: { kind: 'license', id: 'ISC' } },
      },
    ],
    // parentheses override the default precedence
    [
      '(MIT OR Apache-2.0) AND ISC',
      {
        kind: 'and',
        left: { kind: 'or', left: { kind: 'license', id: 'MIT' }, right: { kind: 'license', id: 'Apache-2.0' } },
        right: { kind: 'license', id: 'ISC' },
      },
    ],
    // a chain of the same operator nests to the right
    [
      'MIT OR Apache-2.0 OR ISC',
      {
        kind: 'or',
        left: { kind: 'license', id: 'MIT' },
        right: { kind: 'or', left: { kind: 'license', id: 'Apache-2.0' }, right: { kind: 'license', id: 'ISC' } },
      },
    ],
    ['MIT AND OR Apache-2.0', { kind: 'unknown', raw: 'MIT AND OR Apache-2.0' }],
    // currently Unknown only because the parser rejects it; ticket 03 handles it explicitly
    ['UNLICENSED', { kind: 'unknown', raw: 'UNLICENSED' }],
  ] satisfies [string, LicenseExpression][])(
    'When rawLicense is %s, then it expects %o',
    (rawLicense, expectedResult) => {
      expect(parseLicenseExpression(rawLicense)).toEqual(expectedResult);
    },
  );
});

describe('collectLicenseIds', () => {
  it.each([
    ['MIT', ['MIT']],
    ['MIT OR Apache-2.0', ['MIT', 'Apache-2.0']],
    ['MIT AND LGPL-2.1-only', ['MIT', 'LGPL-2.1-only']],
    ['(MIT OR Apache-2.0) AND ISC', ['MIT', 'Apache-2.0', 'ISC']],
    // identifiers are listed in order of first appearance, without duplicates
    ['(MIT OR ISC) AND (MIT OR Apache-2.0)', ['MIT', 'ISC', 'Apache-2.0']],
    ['MIT AND MIT', ['MIT']],
    ['MIT AND OR Apache-2.0', []],
    ['UNLICENSED', []],
  ] satisfies [string, string[]][])('when raw license is %s, then it returns %o', (rawLicense, expectedResult) => {
    expect(collectLicenseIds(parseLicenseExpression(rawLicense))).toEqual(expectedResult);
  });

  it('when license is unknown with no raw value, then it returns an empty list', () => {
    expect(collectLicenseIds({ kind: 'unknown', raw: null })).toEqual([]);
  });
});

const MIT: LicenseExpression = { kind: 'license', id: 'MIT' };
const APACHE: LicenseExpression = { kind: 'license', id: 'Apache-2.0' };
const ISC: LicenseExpression = { kind: 'license', id: 'ISC' };

const VALID_EXPRESSIONS: [LicenseExpression, string][] = [
  [MIT, 'MIT'],
  [{ kind: 'or', left: MIT, right: APACHE }, 'MIT OR Apache-2.0'],
  [{ kind: 'and', left: MIT, right: APACHE }, 'MIT AND Apache-2.0'],
  // AND inside OR needs no parentheses, since AND binds tighter
  [{ kind: 'or', left: MIT, right: { kind: 'and', left: APACHE, right: ISC } }, 'MIT OR Apache-2.0 AND ISC'],
  [{ kind: 'or', left: { kind: 'and', left: MIT, right: APACHE }, right: ISC }, 'MIT AND Apache-2.0 OR ISC'],
  // OR inside AND needs parentheses on either side
  [{ kind: 'and', left: { kind: 'or', left: MIT, right: APACHE }, right: ISC }, '(MIT OR Apache-2.0) AND ISC'],
  [{ kind: 'and', left: MIT, right: { kind: 'or', left: APACHE, right: ISC } }, 'MIT AND (Apache-2.0 OR ISC)'],
  // a right-nested chain of the same operator needs no parentheses
  [{ kind: 'or', left: MIT, right: { kind: 'or', left: APACHE, right: ISC } }, 'MIT OR Apache-2.0 OR ISC'],
  [{ kind: 'and', left: MIT, right: { kind: 'and', left: APACHE, right: ISC } }, 'MIT AND Apache-2.0 AND ISC'],
  // a left-nested chain of the same operator keeps its parentheses, otherwise it would parse back right-nested
  [{ kind: 'or', left: { kind: 'or', left: MIT, right: APACHE }, right: ISC }, '(MIT OR Apache-2.0) OR ISC'],
  [{ kind: 'and', left: { kind: 'and', left: MIT, right: APACHE }, right: ISC }, '(MIT AND Apache-2.0) AND ISC'],
  [
    {
      kind: 'and',
      left: { kind: 'or', left: MIT, right: APACHE },
      right: { kind: 'or', left: MIT, right: ISC },
    },
    '(MIT OR Apache-2.0) AND (MIT OR ISC)',
  ],
];

describe('renderLicenseExpression', () => {
  it.each(VALID_EXPRESSIONS)('when expression is %o, then it renders %s', (expression, expectedResult) => {
    expect(renderLicenseExpression(expression)).toBe(expectedResult);
  });

  it('when license is unknown, then it renders the raw value', () => {
    expect(renderLicenseExpression({ kind: 'unknown', raw: 'SEE LICENSE IN LICENSE.md' })).toBe(
      'SEE LICENSE IN LICENSE.md',
    );
  });

  it('when license is unknown with no raw value, then it renders unknown', () => {
    expect(renderLicenseExpression({ kind: 'unknown', raw: null })).toBe('unknown');
  });

  it.each(VALID_EXPRESSIONS)(
    'when expression %o is rendered and parsed back, then it is the same tree',
    (expression) => {
      expect(parseLicenseExpression(renderLicenseExpression(expression))).toEqual(expression);
    },
  );

  it.each(VALID_EXPRESSIONS.map(([, rendered]) => rendered))(
    'when normalized raw license %s is parsed and rendered back, then it is unchanged',
    (rawLicense) => {
      expect(renderLicenseExpression(parseLicenseExpression(rawLicense))).toBe(rawLicense);
    },
  );
});
