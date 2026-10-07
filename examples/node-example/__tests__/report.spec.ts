import { platform } from 'node:os';
import path from 'node:path';

import {
  dependencies as licenseKitDependenciesObj,
  devDependencies as licenseKitDevDependenciesObj,
  version as licenseKitVersion,
} from '../../../packages/license-kit/package.json';
import {
  dependencies as sharedDependenciesObj,
  devDependencies as sharedDevDependenciesObj,
} from '../../../packages/licenses-api/package.json';
import {
  dependencyMappingToCorrespondingKey,
  getDependencyCorrespondingKey,
  runLicenseKit,
  stripVersionSuffixes,
} from '../__utils__/utils';
import {
  dependencies as dependenciesObj,
  devDependencies as devDependenciesObj,
  optionalDependencies as optionalDependenciesObj,
} from '../package.json';

// do not expect the private test package to be in the assertions baseline, it shall be excluded
const dependencies = dependencyMappingToCorrespondingKey(dependenciesObj).filter(
  (dep) => dep !== '@callstack/example-private-package@workspace:*',
);
const devDependencies = dependencyMappingToCorrespondingKey(devDependenciesObj);
const optionalDependencies = dependencyMappingToCorrespondingKey(optionalDependenciesObj);
const licenseKitDependencies = dependencyMappingToCorrespondingKey(licenseKitDependenciesObj);
const licenseKitDevDependencies = dependencyMappingToCorrespondingKey(licenseKitDevDependenciesObj);
const sharedDependencies = dependencyMappingToCorrespondingKey(sharedDependenciesObj);
const sharedDevDependencies = dependencyMappingToCorrespondingKey(sharedDevDependenciesObj);

// below: correct the expected license-kit version (expected result) to match the actual version instead of specified version
devDependencies[Object.keys(devDependenciesObj).indexOf('license-kit')] = `license-kit@${licenseKitVersion}`;

async function runLicenseKitStdout(args: string[]) {
  return (await runLicenseKit(args)).stdout;
}

async function runReportCommandForJsonOutput(args: string[] = []) {
  return JSON.parse(await runLicenseKitStdout(['report', ...args]));
}

const FIXTURE_ROOTS_DIR = path.resolve(__dirname, '..', '..', 'packages');

describe('license-kit report', () => {
  describe('with a License Exception', () => {
    const root = path.join(FIXTURE_ROOTS_DIR, 'example-copyleft-root-with-exception');
    const packageName = '@callstack/example-license-gpl-2.0-with-classpath-exception';

    it('when format is json, then the leaf keeps the exception', async () => {
      const json = JSON.parse(await runLicenseKitStdout(['report', '--root', root]));

      expect(json[`${packageName}@1.0.0`]).toMatchObject({
        rawLicense: 'GPL-2.0-only WITH Classpath-exception-2.0',
        license: { kind: 'license', id: 'GPL-2.0-only', exception: 'Classpath-exception-2.0' },
        licenseIds: ['GPL-2.0-only'],
      });
    });

    it.each(['text', 'markdown'])('when format is %s, then it prints the exception', async (format) => {
      const output = await runLicenseKitStdout(['report', '--root', root, '--format', format]);

      expect(output).toMatch('GPL-2.0-only WITH Classpath-exception-2.0');
    });
  });

  it('when a package uses the legacy licenses array, then the Raw License is its types joined with OR', async () => {
    const json = JSON.parse(
      await runLicenseKitStdout([
        'report',
        '--root',
        path.join(FIXTURE_ROOTS_DIR, 'example-copyleft-root-legacy-licenses-array'),
      ]),
    );

    expect(json['@callstack/example-license-legacy-licenses-array@1.0.0']).toMatchObject({
      rawLicense: 'MIT OR Apache-2.0',
      license: {
        kind: 'or',
        left: { kind: 'license', id: 'MIT' },
        right: { kind: 'license', id: 'Apache-2.0' },
      },
      licenseIds: ['MIT', 'Apache-2.0'],
    });
  });

  it('when licenses are Unknown, then report keeps the Raw License and has no License Identifiers', async () => {
    const json = JSON.parse(
      await runLicenseKitStdout([
        'report',
        '--root',
        path.join(FIXTURE_ROOTS_DIR, 'example-copyleft-root-unknown-licenses'),
      ]),
    );

    expect(json['@callstack/example-license-unlicensed@1.0.0']).toMatchObject({
      rawLicense: 'UNLICENSED',
      license: { kind: 'unknown', raw: 'UNLICENSED' },
      licenseIds: [],
    });
    expect(json['@callstack/example-license-see-license-in@1.0.0']).toMatchObject({
      rawLicense: 'SEE LICENSE IN LICENSE.md',
      license: { kind: 'unknown', raw: 'SEE LICENSE IN LICENSE.md' },
      licenseIds: [],
    });
  });

  describe('with a Dual License shipping LICENSE-MIT and LICENSE-APACHE', () => {
    const key = '@callstack/example-license-mit-or-apache-2.0@1.0.0';

    it('when format is json, then licenseFiles has both files linked to their License Identifiers', async () => {
      const json = await runReportCommandForJsonOutput();

      expect(json[key].licenseFiles).toEqual([
        expect.objectContaining({ file: 'LICENSE-APACHE', licenseId: 'Apache-2.0', content: expect.any(String) }),
        expect.objectContaining({ file: 'LICENSE-MIT', licenseId: 'MIT', content: expect.any(String) }),
      ]);
    });

    it('when format is text, then both license texts are printed', async () => {
      const output = await runLicenseKitStdout(['report', '--format', 'text']);

      expect(output).toContain('MIT half');
      expect(output).toContain('Apache-2.0 half');
      expect(output).toContain('File: LICENSE-APACHE, LICENSE-MIT');
    });

    it('when format is about-json, then the library has two licenses, each with its own text', async () => {
      const output = JSON.parse(await runLicenseKitStdout(['report', '--format', 'about-json']));
      const entry = output.find(
        (item: { normalizedPackageNameWithVersion: string }) =>
          item.normalizedPackageNameWithVersion === key.replace('/', '_'),
      );

      expect(entry.libraryJsonPayload.licenses).toHaveLength(2);
      expect(entry.licenseJsonPayloads.map((l: { hash: string }) => l.hash)).toEqual(entry.libraryJsonPayload.licenses);
      expect(entry.licenseJsonPayloads).toEqual([
        expect.objectContaining({ name: 'MIT', content: expect.stringContaining('MIT half') }),
        expect.objectContaining({ name: 'Apache-2.0', content: expect.stringContaining('Apache-2.0 half') }),
      ]);
    });
  });

  it('analyze --list-unknown lists Unknown Licenses with their Raw License', async () => {
    const output = await runLicenseKitStdout([
      'analyze',
      '--list-unknown',
      '--root',
      path.join(FIXTURE_ROOTS_DIR, 'example-copyleft-root-unknown-licenses'),
    ]);

    expect(output).toMatch(/example-license-unlicensed@1\.0\.0\s+│ UNLICENSED/);
    expect(output).toMatch(/example-license-see-license-in@1\.0\.0\s+│ SEE LICENSE IN LICENSE\.md/);
  });

  it('including transitive deps, with dev deps with default settings', async () => {
    const json = await runReportCommandForJsonOutput();

    const isEvenPackageKey = getDependencyCorrespondingKey(dependenciesObj, 'is-even');
    const mariadbPackageKey = getDependencyCorrespondingKey(dependenciesObj, 'mariadb');
    const zustandPackageKey = getDependencyCorrespondingKey(dependenciesObj, 'zustand');

    expect(json[getDependencyCorrespondingKey(dependenciesObj, 'dhtmlx-gantt')].licenseIds).toContain('GPL-2.0-only');
    expect(json[isEvenPackageKey].licenseFiles[0].content).toMatch('MIT License');
    expect(json[isEvenPackageKey].licenseIds).toEqual(['MIT']);
    expect(json[mariadbPackageKey].licenseFiles[0].content).toMatch('GNU LESSER GENERAL PUBLIC LICENSE');
    expect(json[mariadbPackageKey].licenseIds).toEqual(['LGPL-2.1-or-later']);
    expect(json[zustandPackageKey].licenseFiles[0].content).toMatch('MIT License');
    expect(json[zustandPackageKey].licenseIds).toEqual(['MIT']);

    for (const entry of Object.values(json)) {
      expect(entry).toHaveProperty('rawLicense');
      expect(entry).toHaveProperty('license');
      expect(entry).toHaveProperty('licenseIds');
      expect(entry).toHaveProperty('licenseFiles');
      expect(entry).not.toHaveProperty('type');
      expect(entry).not.toHaveProperty('content');
      expect(entry).not.toHaveProperty('file');
    }
  });

  it('without transitive deps and without dev deps', async () => {
    const json = await runReportCommandForJsonOutput(['--dev-deps-mode', 'none', '--transitive-deps-mode', 'none']);

    expect(stripVersionSuffixes(Object.keys(json).toSorted())).toEqual(
      stripVersionSuffixes([...dependencies, ...optionalDependencies].toSorted()),
    );
  });

  it('without transitive deps and with root-only dev deps', async () => {
    const json = await runReportCommandForJsonOutput([
      '--dev-deps-mode',
      'root-only',
      '--transitive-deps-mode',
      'none',
    ]);

    expect(stripVersionSuffixes(Object.keys(json).toSorted())).toEqual(
      stripVersionSuffixes(
        Array.from(new Set([...dependencies, ...optionalDependencies, ...devDependencies])).toSorted(),
      ),
    );
  });

  it('includes rawLicense, the parsed License Expression and licenseIds for single licenses and License Expressions', async () => {
    const json = await runReportCommandForJsonOutput();

    expect(json[getDependencyCorrespondingKey(dependenciesObj, 'is-even')!]).toMatchObject({
      rawLicense: 'MIT',
      license: { kind: 'license', id: 'MIT' },
      licenseIds: ['MIT'],
    });
    expect(json['@callstack/example-license-mit-or-apache-2.0@1.0.0']).toMatchObject({
      rawLicense: 'MIT OR Apache-2.0',
      license: { kind: 'or', left: { kind: 'license', id: 'MIT' }, right: { kind: 'license', id: 'Apache-2.0' } },
      licenseIds: ['MIT', 'Apache-2.0'],
    });
    expect(json['@callstack/example-license-mit-or-apache-2.0-and-isc@1.0.0']).toMatchObject({
      rawLicense: 'MIT OR Apache-2.0 AND ISC',
      license: {
        kind: 'or',
        left: { kind: 'license', id: 'MIT' },
        right: { kind: 'and', left: { kind: 'license', id: 'Apache-2.0' }, right: { kind: 'license', id: 'ISC' } },
      },
      licenseIds: ['MIT', 'Apache-2.0', 'ISC'],
    });
    expect(json['@callstack/example-license-apache-2.0-or-lgpl-3.0-and-mit-or-gpl-2.0@1.0.0']).toMatchObject({
      rawLicense: '(Apache-2.0 OR LGPL-3.0-only) AND (MIT OR GPL-2.0-only)',
      license: {
        kind: 'and',
        left: {
          kind: 'or',
          left: { kind: 'license', id: 'Apache-2.0' },
          right: { kind: 'license', id: 'LGPL-3.0-only' },
        },
        right: { kind: 'or', left: { kind: 'license', id: 'MIT' }, right: { kind: 'license', id: 'GPL-2.0-only' } },
      },
      licenseIds: ['Apache-2.0', 'LGPL-3.0-only', 'MIT', 'GPL-2.0-only'],
    });
  });

  it("does not include private packages' licenses", async () => {
    const json = await runReportCommandForJsonOutput();

    expect(Object.keys(json).toSorted()).not.toIncludeAllMembers(['@callstack/example-private-package']);
  });

  it('with root-only dev deps and with transitive dependencies of workspace-specifier-only dependencies', async () => {
    const json = await runReportCommandForJsonOutput([
      '--dev-deps-mode',
      'root-only',
      '--transitive-deps-mode',
      'from-workspace-only',
    ]);

    expect(stripVersionSuffixes(Object.keys(json).toSorted())).toEqual(
      stripVersionSuffixes(
        Array.from(
          new Set([...dependencies, ...devDependencies, ...licenseKitDependencies, ...optionalDependencies]),
        ).toSorted(),
      ),
    );
  });

  it('without dev deps and with transitive dependencies of external dependencies only', async () => {
    const json = await runReportCommandForJsonOutput([
      '--dev-deps-mode',
      'none',
      '--transitive-deps-mode',
      'from-external-only',
    ]);

    const resultKeys = Object.keys(json);

    expect(stripVersionSuffixes(resultKeys.toSorted())).toEqual([
      '@callstack/example-license-apache-2.0-or-lgpl-3.0-and-mit-or-gpl-2.0',
      '@callstack/example-license-gpl-3.0-and-mit-or-apache-2.0',
      '@callstack/example-license-lgpl-2.1-or-gpl-3.0',
      '@callstack/example-license-mit-and-lgpl-2.1',
      '@callstack/example-license-mit-or-apache-2.0-and-isc',
      '@callstack/example-license-mit-or-apache-2.0',
      '@callstack/example-license-mit-or-gpl-3.0-in-and-with-lgpl-2.1',
      '@callstack/example-license-mit-or-gpl-3.0',
      '@types/geojson',
      '@types/node',
      'chartjs-plugin-dragdata',
      'd3-dispatch',
      'd3-drag',
      'd3-selection',
      'denque',
      'dhtmlx-gantt',
      'iconv-lite',
      'is-buffer',
      'is-even',
      'is-number',
      'is-odd',
      'kind-of',
      'lru-cache',
      'mariadb',
      'safer-buffer',
      'undici-types',
      'zustand',
    ]);

    expect(resultKeys).not.toIncludeAnyMembers(licenseKitDependencies);
    expect(resultKeys).not.toIncludeAnyMembers(licenseKitDevDependencies);
  });

  it('with root-only dev deps and with transitive dependencies of external dependencies only', async () => {
    const json = await runReportCommandForJsonOutput([
      '--dev-deps-mode',
      'root-only',
      '--transitive-deps-mode',
      'from-external-only',
    ]);

    const resultKeys = Object.keys(json);

    expect(resultKeys).toContain(`license-kit@${licenseKitVersion}`);

    // this time, the result should also include all dependencies of the direct devDependencies of the root package.json
    expect(resultKeys.length).toBeGreaterThan(200);
    expect(stripVersionSuffixes(resultKeys)).toIncludeAllMembers([
      '@babel/plugin-transform-async-to-generator',
      '@babel/plugin-transform-block-scoped-functions',
      '@babel/plugin-transform-block-scoping',
      '@babel/plugin-transform-class-properties',
      '@babel/helper-create-class-features-plugin',
      '@babel/helper-member-expression-to-functions',
    ]);

    expect(resultKeys).not.toIncludeAllMembers(licenseKitDependencies);
    expect(resultKeys).not.toIncludeAllMembers(licenseKitDevDependencies);

    // note: sharedDependencies should not be included, yet they contain glob, which is a transitive dependency of something else
    expect(resultKeys).not.toIncludeAllMembers(sharedDevDependencies);
  });

  it('with root-only dev deps and with all transitive dependencies', async () => {
    const json = await runReportCommandForJsonOutput(['--dev-deps-mode', 'root-only', '--transitive-deps-mode', 'all']);

    const resultKeys = Object.keys(json);
    const resultKeysWithoutVersions = stripVersionSuffixes(resultKeys);

    // this time, the result should also include all transitive dependencies of direct devDependencies of the root package.json,
    // such as that of license-kit itself (which is a direct devDependency of the root package.json)
    expect(resultKeys.length).toBeGreaterThan(300);
    expect(resultKeysWithoutVersions).toContain('license-kit');
    expect(resultKeysWithoutVersions).toContain('@callstack/licenses');

    expect(resultKeysWithoutVersions).toIncludeAllMembers(stripVersionSuffixes(licenseKitDependencies));
    expect(resultKeysWithoutVersions).not.toIncludeAllMembers(stripVersionSuffixes(licenseKitDevDependencies));

    expect(resultKeysWithoutVersions).toIncludeAllMembers(stripVersionSuffixes(sharedDependencies));
    expect(resultKeysWithoutVersions).not.toIncludeAllMembers(stripVersionSuffixes(sharedDevDependencies));
  });

  it('without optional dependencies disabled', async () => {
    const json = await runReportCommandForJsonOutput(['--include-optional-deps', 'false']);

    const resultKeys = Object.keys(json);

    // license-kit has a devDependency on tsx, which has an optionalDependency on fsevents
    expect(stripVersionSuffixes(resultKeys)).not.toContain('fsevents');
    expect(resultKeys).not.toIncludeAnyMembers(optionalDependencies);
  });

  it('with optional dependencies enabled', async () => {
    const json = await runReportCommandForJsonOutput(['--include-optional-deps', 'true']);

    const resultKeys = Object.keys(json);

    // license-kit has a devDependency on tsx, which has an optionalDependency on fsevents
    if (platform() === 'darwin') {
      // eslint-disable-next-line jest/no-conditional-expect -- fsevents is macOS-only
      expect(stripVersionSuffixes(resultKeys)).toContain('fsevents');
    }

    expect(resultKeys).toIncludeAnyMembers(optionalDependencies);
  });
});
