import { parseLicenseExpression } from '../../../licenses';
import type { License } from '../../../types';
import { sha512 } from '../miscUtils';
import {
  buildLicensePlistBody,
  parseAuthorField,
  parseLicenseField,
  prepareAboutLibrariesLicenseField,
  prepareAboutLibrariesLicenses,
} from '../packageUtils';

const makeLicense = (overrides: Partial<License>): License =>
  ({
    name: 'pkg',
    version: '1.0.0',
    dependencyType: 'dependency',
    requiredVersion: '1.0.0',
    parentPackages: [],
    licenseFiles: [],
    licenseIds: [],
    rawLicense: null,
    ...overrides,
  }) as License;

describe('parseAuthorField', () => {
  it('should return author name when author is an object with name field', () => {
    const json = { author: { name: 'John Doe' } };

    expect(parseAuthorField(json)).toBe('John Doe');
  });

  it('should return author string when author is a string', () => {
    const json = { author: 'John Doe' };

    expect(parseAuthorField(json)).toBe('John Doe');
  });

  it('should return undefined when author is an object without name field', () => {
    const json = { author: {} as any };

    expect(parseAuthorField(json)).toBeUndefined();
  });

  it('should return undefined when author is undefined', () => {
    const json = { author: undefined as any };

    expect(parseAuthorField(json)).toBeUndefined();
  });
});

describe('parseLicenseField', () => {
  it('should return license type when license is an object with type field', () => {
    const json = { license: { type: 'MIT' } };

    expect(parseLicenseField(json)).toBe('MIT');
  });

  it('should return license string when license is a string', () => {
    const json = { license: 'Apache-2.0' };

    expect(parseLicenseField(json)).toBe('Apache-2.0');
  });

  it('should join the types of a legacy licenses array with OR', () => {
    const json = { licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] } as any;

    expect(parseLicenseField(json)).toBe('MIT OR Apache-2.0');
  });

  it('should use the single type of a legacy licenses array', () => {
    const json = { licenses: [{ type: 'MIT' }] } as any;

    expect(parseLicenseField(json)).toBe('MIT');
  });

  it('should prefer the license field over the legacy licenses array', () => {
    const json = { license: 'ISC', licenses: [{ type: 'MIT' }] } as any;

    expect(parseLicenseField(json)).toBe('ISC');
  });

  it('should skip legacy licenses entries without a type', () => {
    const json = { licenses: [{}, { type: 'MIT' }] } as any;

    expect(parseLicenseField(json)).toBe('MIT');
  });

  it('should skip legacy licenses entries with an empty type', () => {
    const json = { licenses: [{ type: ' ' }, { type: 'MIT' }] } as any;

    expect(parseLicenseField(json)).toBe('MIT');
  });

  it('should return undefined when the legacy licenses array has no types', () => {
    const json = { licenses: [] } as any;

    expect(parseLicenseField(json)).toBeUndefined();
  });

  it('should return undefined when license is an object without type field', () => {
    const json = { license: {} as any };

    expect(parseLicenseField(json)).toBeUndefined();
  });

  it('should return undefined when license is undefined', () => {
    const json = { license: undefined as any };

    expect(parseLicenseField(json)).toBeUndefined();
  });
});

describe('prepareAboutLibrariesLicenseField', () => {
  it('builds <name>_<hash> for plain license names', () => {
    expect(prepareAboutLibrariesLicenseField('MIT', 'license body')).toBe(`MIT_${sha512('license body')}`);
  });

  it('sanitizes "/" so legacy SPDX like "MIT/X11" does not create a subdirectory on disk', () => {
    const result = prepareAboutLibrariesLicenseField('MIT/X11', 'license body');

    expect(result).not.toContain('/');
    expect(result.startsWith('MIT_X11_')).toBe(true);
  });

  it('sanitizes parentheses and spaces in compound SPDX expressions', () => {
    const result = prepareAboutLibrariesLicenseField('(MIT OR Apache-2.0)', 'license body');

    expect(result).not.toMatch(/[()\s]/);
    expect(result.startsWith('_MIT_OR_Apache-2.0__')).toBe(true);
  });

  it('hashes the sanitized name when content is absent so the prefix matches the hash input', () => {
    expect(prepareAboutLibrariesLicenseField('MIT/X11')).toBe(`MIT_X11_${sha512('MIT/X11')}`);
  });
});

describe('prepareAboutLibrariesLicenses', () => {
  it('gives each License Identifier its linked license file', () => {
    const result = prepareAboutLibrariesLicenses(
      makeLicense({
        license: parseLicenseExpression('MIT OR Apache-2.0'),
        licenseIds: ['MIT', 'Apache-2.0'],
        licenseFiles: [
          { file: '/p/LICENSE-MIT', content: 'mit text', licenseId: 'MIT' },
          { file: '/p/LICENSE-APACHE', content: 'apache text', licenseId: 'Apache-2.0' },
        ],
      }),
    );

    expect(result).toEqual([
      { name: 'MIT', content: 'mit text' },
      { name: 'Apache-2.0', content: 'apache text' },
    ]);
  });

  it('gives each License Identifier the single unlinked text', () => {
    const result = prepareAboutLibrariesLicenses(
      makeLicense({
        license: parseLicenseExpression('MIT OR Apache-2.0'),
        licenseIds: ['MIT', 'Apache-2.0'],
        licenseFiles: [{ file: '/p/LICENSE', content: 'both' }],
      }),
    );

    expect(result.map(({ content }) => content)).toEqual(['both', 'both']);
  });

  it('gives a single License Identifier every unlinked text', () => {
    const result = prepareAboutLibrariesLicenses(
      makeLicense({
        license: parseLicenseExpression('MIT'),
        licenseIds: ['MIT'],
        licenseFiles: [
          { file: '/p/LICENSE', content: 'a' },
          { file: '/p/LICENSE.txt', content: 'b' },
        ],
      }),
    );

    expect(result).toEqual([{ name: 'MIT', content: 'a\n\nb' }]);
  });

  it('keeps the text of a package that declares no license', () => {
    const result = prepareAboutLibrariesLicenses(
      makeLicense({
        license: { kind: 'unknown', raw: null },
        licenseFiles: [{ file: '/p/LICENSE', content: 'text' }],
      }),
    );

    expect(result).toEqual([{ name: 'unknown', content: 'text' }]);
  });

  it('uses the Raw License as the name of an Unknown License and nothing when none is declared', () => {
    expect(
      prepareAboutLibrariesLicenses(
        makeLicense({ rawLicense: 'UNLICENSED', license: { kind: 'unknown', raw: 'UNLICENSED' } }),
      ),
    ).toEqual([{ name: 'UNLICENSED', content: '' }]);
    expect(prepareAboutLibrariesLicenses(makeLicense({ license: { kind: 'unknown', raw: null } }))).toEqual([]);
  });
});

describe('prepareAboutLibrariesLicenses names', () => {
  it('keeps the License Exception and a retained "+" in the name', () => {
    const names = (raw: string) =>
      prepareAboutLibrariesLicenses(
        makeLicense({ license: parseLicenseExpression(raw), licenseFiles: [{ file: '/p/LICENSE', content: 't' }] }),
      ).map(({ name }) => name);

    expect(names('GPL-2.0-only WITH Classpath-exception-2.0')).toEqual(['GPL-2.0-only WITH Classpath-exception-2.0']);
    expect(names('Apache-2.0+')).toEqual(['Apache-2.0+']);
  });
});

describe('buildLicensePlistBody', () => {
  it('concatenates every license text under a per-license heading', () => {
    const body = buildLicensePlistBody(
      makeLicense({
        licenseFiles: [
          { file: '/p/LICENSE-MIT', content: 'mit text\n', licenseId: 'MIT' },
          { file: '/p/LICENSE-APACHE', content: 'apache text', licenseId: 'Apache-2.0' },
        ],
      }),
    );

    expect(body).toBe('=== MIT ===\n\nmit text\n\n=== Apache-2.0 ===\n\napache text');
  });

  it('is the rendered expression when there is no text', () => {
    const license = parseLicenseExpression('MIT OR Apache-2.0');

    expect(buildLicensePlistBody(makeLicense({ license, licenseFiles: [] }))).toBe('MIT OR Apache-2.0');
  });
});
