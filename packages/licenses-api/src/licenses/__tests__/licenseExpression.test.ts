import type { LicenseExpression } from '../../types';
import { collectLicenseIds, parseLicenseExpression, renderLicenseExpression } from '../licenseExpression';

type LicenseLeaf = Extract<LicenseExpression, { kind: 'license' }>;

function license(id: string, overrides: Partial<Omit<LicenseLeaf, 'kind' | 'id'>> = {}): LicenseExpression {
  return { kind: 'license', id, declaredId: id, ...overrides };
}

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
    ['MIT', license('MIT')],
    ['MIT OR Apache-2.0', { kind: 'or', left: license('MIT'), right: license('Apache-2.0') }],
    ['MIT AND LGPL-2.1-only', { kind: 'and', left: license('MIT'), right: license('LGPL-2.1-only') }],
    // AND binds tighter than OR (SPDX spec, Annex B.3.4)
    [
      'MIT OR Apache-2.0 AND ISC',
      {
        kind: 'or',
        left: license('MIT'),
        right: { kind: 'and', left: license('Apache-2.0'), right: license('ISC') },
      },
    ],
    // parentheses override the default precedence
    [
      '(MIT OR Apache-2.0) AND ISC',
      {
        kind: 'and',
        left: { kind: 'or', left: license('MIT'), right: license('Apache-2.0') },
        right: license('ISC'),
      },
    ],
    // a chain of the same operator nests to the right
    [
      'MIT OR Apache-2.0 OR ISC',
      {
        kind: 'or',
        left: license('MIT'),
        right: { kind: 'or', left: license('Apache-2.0'), right: license('ISC') },
      },
    ],
    ['MIT AND OR Apache-2.0', { kind: 'unknown', raw: 'MIT AND OR Apache-2.0' }],
  ] satisfies [string, LicenseExpression][])(
    'When rawLicense is %s, then it expects %o',
    (rawLicense, expectedResult) => {
      expect(parseLicenseExpression(rawLicense)).toEqual(expectedResult);
    },
  );
});

describe('parseLicenseExpression: leaf semantics', () => {
  it.each([
    // WITH keeps the License Exception on the leaf
    ['GPL-2.0-only WITH Classpath-exception-2.0', license('GPL-2.0-only', { exception: 'Classpath-exception-2.0' })],
    // `+` is absorbed into the -or-later identifier; declaredId and plus record what was written
    ['LGPL-3.0+', license('LGPL-3.0-or-later', { declaredId: 'LGPL-3.0', plus: true })],
    // no -or-later identifier exists for Apache-2.0, so id is unchanged and plus is kept
    ['Apache-2.0+', license('Apache-2.0', { plus: true })],
    // deprecated identifiers are upgraded
    ['GPL-2.0', license('GPL-2.0-only', { declaredId: 'GPL-2.0' })],
    ['LGPL-2.1', license('LGPL-2.1-only', { declaredId: 'LGPL-2.1' })],
    // deprecated + plus: both are normalized
    ['GPL-2.0+', license('GPL-2.0-or-later', { declaredId: 'GPL-2.0', plus: true })],
    // a deprecated identifier with no -only counterpart stays as written
    ['GPL-2.0-with-classpath-exception', license('GPL-2.0-with-classpath-exception')],
    // already canonical identifiers are untouched
    ['GPL-2.0-only', license('GPL-2.0-only')],
    ['GPL-2.0-or-later', license('GPL-2.0-or-later')],
    // WITH and + combine
    [
      'GPL-2.0+ WITH Classpath-exception-2.0',
      license('GPL-2.0-or-later', { declaredId: 'GPL-2.0', plus: true, exception: 'Classpath-exception-2.0' }),
    ],
    // LicenseRef-* parses as a leaf (it is classified as unknown later)
    ['LicenseRef-Custom', license('LicenseRef-Custom')],
    // normalization applies inside compound expressions
    [
      'GPL-2.0 OR LGPL-3.0+',
      {
        kind: 'or',
        left: license('GPL-2.0-only', { declaredId: 'GPL-2.0' }),
        right: license('LGPL-3.0-or-later', { declaredId: 'LGPL-3.0', plus: true }),
      },
    ],
  ] satisfies [string, LicenseExpression][])('when raw license is %s, then it expects %o', (rawLicense, expected) => {
    expect(parseLicenseExpression(rawLicense)).toEqual(expected);
  });

  it.each([
    'UNLICENSED',
    'SEE LICENSE IN LICENSE.md',
    'NONE',
    'NOASSERTION',
    // an unrecognised identifier or exception makes the whole expression Unknown: there is no partial tree
    'MIT OR Foo-1.0',
    'GPL-2.0-only WITH Foo-exception',
    'MIT AND (Apache-2.0 OR Foo-1.0)',
    // a License Exception must be attached to a license
    'WITH Classpath-exception-2.0',
  ])('when raw license is %s, then it is Unknown and keeps the raw value', (rawLicense) => {
    expect(parseLicenseExpression(rawLicense)).toEqual({ kind: 'unknown', raw: rawLicense });
  });

  it('when an exception is written without WITH, then it is unknown', () => {
    expect(parseLicenseExpression('mit or classpath-exception-2.0')).toEqual({
      kind: 'unknown',
      raw: 'mit or classpath-exception-2.0',
    });
  });

  it('when raw license is a lowercase deprecated identifier, then it is upgraded', () => {
    expect(parseLicenseExpression('gpl-2.0')).toEqual(license('GPL-2.0-only', { declaredId: 'GPL-2.0' }));
  });

  it('when raw license is unlicensed in any case, then it is unknown and never Unlicense', () => {
    expect(parseLicenseExpression('unlicensed')).toEqual({ kind: 'unknown', raw: 'unlicensed' });
  });

  it('when raw license is UNLICENSED, then it is never confused with Unlicense', () => {
    expect(collectLicenseIds(parseLicenseExpression('UNLICENSED'))).not.toContain('Unlicense');
    expect(parseLicenseExpression('UNLICENSED').kind).toBe('unknown');
  });
});

describe('collectLicenseIds', () => {
  // licenseIds holds canonical ids, not what was declared
  it.each([
    ['GPL-2.0', ['GPL-2.0-only']],
    ['LGPL-3.0+', ['LGPL-3.0-or-later']],
    ['Apache-2.0+', ['Apache-2.0']],
    ['GPL-2.0-only WITH Classpath-exception-2.0', ['GPL-2.0-only']],
    // a deprecated and a canonical spelling of the same license are deduplicated
    ['GPL-2.0 OR GPL-2.0-only', ['GPL-2.0-only']],
    ['LicenseRef-Custom', ['LicenseRef-Custom']],
  ] satisfies [string, string[]][])('when raw license is %s, then it returns %o', (rawLicense, expectedResult) => {
    expect(collectLicenseIds(parseLicenseExpression(rawLicense))).toEqual(expectedResult);
  });

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

const MIT: LicenseExpression = license('MIT');
const APACHE: LicenseExpression = license('Apache-2.0');
const ISC: LicenseExpression = license('ISC');

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

describe('renderLicenseExpression: leaf semantics', () => {
  it.each([
    ['GPL-2.0-only WITH Classpath-exception-2.0', 'GPL-2.0-only WITH Classpath-exception-2.0'],
    // canonical identifiers are rendered, not what was declared
    ['GPL-2.0', 'GPL-2.0-only'],
    ['LGPL-3.0+', 'LGPL-3.0-or-later'],
    // `+` is rendered where it could not be absorbed
    ['Apache-2.0+', 'Apache-2.0+'],
    ['GPL-2.0+ WITH Classpath-exception-2.0', 'GPL-2.0-or-later WITH Classpath-exception-2.0'],
    // the exception binds tighter than AND and OR, so it needs no parentheses
    ['MIT AND GPL-2.0-only WITH Classpath-exception-2.0', 'MIT AND GPL-2.0-only WITH Classpath-exception-2.0'],
    ['GPL-2.0-only WITH Classpath-exception-2.0 OR MIT', 'GPL-2.0-only WITH Classpath-exception-2.0 OR MIT'],
  ] satisfies [string, string][])('when raw license is %s, then it renders %s', (rawLicense, expected) => {
    expect(renderLicenseExpression(parseLicenseExpression(rawLicense))).toBe(expected);
  });

  it.each([
    license('Apache-2.0', { plus: true }),
    license('GPL-2.0-only', { exception: 'Classpath-exception-2.0' }),
    license('GPL-2.0-or-later', { exception: 'Classpath-exception-2.0' }),
    license('LicenseRef-Custom'),
  ])('when leaf %o is rendered and parsed back, then it is the same tree', (leaf) => {
    expect(parseLicenseExpression(renderLicenseExpression(leaf))).toEqual(leaf);
  });
});

describe('parseLicenseExpression: input normalization', () => {
  it.each([
    ['mit', license('MIT')],
    ['Mit', license('MIT')],
    [
      'mit or apache-2.0',
      {
        kind: 'or',
        left: license('MIT'),
        right: license('Apache-2.0'),
      },
    ],
    ['lgpl-3.0+', license('LGPL-3.0-or-later', { declaredId: 'LGPL-3.0', plus: true })],
    ['gpl-2.0-only with classpath-exception-2.0', license('GPL-2.0-only', { exception: 'Classpath-exception-2.0' })],
    ['(mit)', license('MIT')],
  ] satisfies [string, LicenseExpression][])(
    'when raw license is %s, then it is matched case-insensitively',
    (rawLicense, expected) => {
      expect(parseLicenseExpression(rawLicense)).toEqual(expected);
    },
  );

  it.each([
    ['Apache 2.0', 'Apache-2.0'],
    ['Apache-2', 'Apache-2.0'],
    ['Apache License 2.0', 'Apache-2.0'],
    ['MIT/X11', 'MIT'],
    ['MIT License', 'MIT'],
    ['  mit license ', 'MIT'],
  ])('when raw license is the alias %s, then it normalizes to %s', (rawLicense, expectedId) => {
    expect(parseLicenseExpression(rawLicense)).toMatchObject({ kind: 'license', id: expectedId });
  });

  it.each(['BSD', 'GPL', 'LGPL', 'bsd', 'MIT OR GPL', 'MIT OR Foo-1.0'])(
    'when raw license is the ambiguous or unrecognised %s, then it is unknown',
    (rawLicense) => {
      const result = parseLicenseExpression(rawLicense);

      expect(result).toEqual({ kind: 'unknown', raw: rawLicense });
    },
  );

  it('when raw license is UNLICENSED, then it is unknown and never Unlicense', () => {
    expect(parseLicenseExpression('UNLICENSED')).toEqual({ kind: 'unknown', raw: 'UNLICENSED' });
  });

  it('when raw license is MIT OR GPL, then it never collapses to a single GPL identifier', () => {
    expect(collectLicenseIds(parseLicenseExpression('MIT OR GPL'))).toEqual([]);
  });

  it('when a LicenseRef has a lowercase prefix, then only the known part is case-insensitive', () => {
    expect(parseLicenseExpression('licenseref-Custom')).toMatchObject({ kind: 'license', id: 'LicenseRef-Custom' });
  });
});
