import { generateLicensePlistNPMOutput } from '../common';

const makeLicense = (licenseFiles: { file: string; content: string; licenseId?: string }[]) =>
  ({
    name: '@scope/pkg',
    version: '1.0.0',
    dependencyType: 'dependency',
    requiredVersion: '1.0.0',
    parentPackages: [],
    rawLicense: 'MIT OR Apache-2.0',
    licenseIds: ['MIT', 'Apache-2.0'],
    licenseFiles,
  }) as never;

describe('generateLicensePlistNPMOutput', () => {
  it('when a package has several license files, then the body has every text under its License Identifier heading', () => {
    const yaml = generateLicensePlistNPMOutput(
      {
        '@scope/pkg@1.0.0': makeLicense([
          { file: '/p/LICENSE-APACHE', content: 'Apache-2.0 half', licenseId: 'Apache-2.0' },
          { file: '/p/LICENSE-MIT', content: 'MIT half', licenseId: 'MIT' },
        ]),
      },
      '/ios',
    );

    expect(yaml).toContain('=== Apache-2.0 ===');
    expect(yaml).toContain('Apache-2.0 half');
    expect(yaml).toContain('=== MIT ===');
    expect(yaml).toContain('MIT half');
  });

  it('when a package has one license file, then the entry references it relative to the iOS project', () => {
    const yaml = generateLicensePlistNPMOutput(
      { '@scope/pkg@1.0.0': makeLicense([{ file: '/project/node_modules/pkg/LICENSE', content: 'text' }]) },
      '/project/ios',
    );

    expect(yaml).toContain("file: '../node_modules/pkg/LICENSE'");
    expect(yaml).not.toContain('body');
  });
});
