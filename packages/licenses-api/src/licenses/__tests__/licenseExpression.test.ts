import type { LicenseExpression } from '../../types';
import { collectLicenseIds, parseLicenseExpression } from '../licenseExpression';

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
