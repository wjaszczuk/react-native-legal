import path from 'node:path';

import { runLicenseKit } from '../__utils__/utils';

type CopyleftSection = 'strong' | 'weak';

const FIXTURE_ROOTS_DIR = path.resolve(__dirname, '..', '..', 'packages');

function runCopyleftCommand(args: string[] = []) {
  return runLicenseKit(['copyleft', ...args]);
}

/**
 * Maps each listed package to the section of the copyleft output it is listed in, together with its rendered license.
 */
function parseCopyleftOutput(stderr: string) {
  const listed: Record<string, { section: CopyleftSection; license: string }> = {};

  let section: CopyleftSection | undefined;

  for (const line of stderr.split('\n')) {
    if (line.includes('Weak copyleft licenses found')) {
      section = 'weak';
    } else if (line.includes('Copyleft licenses found')) {
      section = 'strong';
    }

    const match = line.match(/^- (.+?): (.+?)(?: \([^()]*\/[^()]*\))?$/);

    if (match && section) {
      listed[match[1]] = { section, license: match[2] };
    }
  }

  return listed;
}

describe('license-kit copyleft', () => {
  it.each(['most-restrictive', 'least-restrictive'])(
    'when a package uses the legacy licenses array of permissive licenses, then it exits 0 with --or-policy %s',
    async (orPolicy) => {
      const root = path.join(FIXTURE_ROOTS_DIR, 'example-copyleft-root-legacy-licenses-array');
      const { exitCode } = await runCopyleftCommand(['--root', root, '--or-policy', orPolicy]);

      expect(exitCode).toBe(0);
    },
  );

  it('should report error for strong copyleft licenses', async () => {
    const { stderr } = await runCopyleftCommand();

    expect(stderr).toMatch('Copyleft licenses found in the following dependencies:');
    expect(stderr).toMatch('dhtmlx-gantt: GPL-2.0');
  });

  it('should report error for strong and weak copyleft licenses', async () => {
    const { stderr } = await runCopyleftCommand(['--error-on-weak']);

    expect(stderr).toMatch('Copyleft licenses found in the following dependencies:');
    expect(stderr).toMatch('dhtmlx-gantt: GPL-2.0');
    expect(stderr).toMatch('Weak copyleft licenses found in the following dependencies:');
    expect(stderr).toMatch('mariadb: LGPL-2.1-or-later');
  });

  describe('with License Expressions', () => {
    // package -> [rendered license, section under most-restrictive, section under least-restrictive]
    const EXPECTED_SECTIONS: [string, string, CopyleftSection | undefined, CopyleftSection | undefined][] = [
      ['@callstack/example-license-mit-or-apache-2.0', 'MIT OR Apache-2.0', undefined, undefined],
      ['@callstack/example-license-mit-and-lgpl-2.1', 'MIT AND LGPL-2.1-only', 'weak', 'weak'],
      ['@callstack/example-license-mit-or-gpl-3.0', 'MIT OR GPL-3.0-only', 'strong', undefined],
      ['@callstack/example-license-mit-or-apache-2.0-and-isc', 'MIT OR Apache-2.0 AND ISC', undefined, undefined],
      [
        '@callstack/example-license-mit-or-gpl-3.0-in-and-with-lgpl-2.1',
        '(MIT OR GPL-3.0-only) AND LGPL-2.1-only',
        'strong',
        'weak',
      ],
      ['@callstack/example-license-lgpl-2.1-or-gpl-3.0', 'LGPL-2.1-only OR GPL-3.0-only', 'strong', 'weak'],
      [
        '@callstack/example-license-apache-2.0-or-lgpl-3.0-and-mit-or-gpl-2.0',
        '(Apache-2.0 OR LGPL-3.0-only) AND (MIT OR GPL-2.0-only)',
        'strong',
        undefined,
      ],
      [
        '@callstack/example-license-gpl-3.0-and-mit-or-apache-2.0',
        'GPL-3.0-only AND (MIT OR Apache-2.0)',
        'strong',
        'strong',
      ],
    ];

    it.each([
      ['most-restrictive', 2],
      ['least-restrictive', 3],
    ] as const)(
      'when OR Policy is %s, then each License Expression package is listed as strong or weak copyleft, or not listed when permissive',
      async (orPolicy, sectionIndex) => {
        const { stderr } = await runCopyleftCommand(['--or-policy', orPolicy]);
        const listed = parseCopyleftOutput(stderr);

        for (const expected of EXPECTED_SECTIONS) {
          const [packageName, license] = expected;
          const section = expected[sectionIndex];

          expect({ packageName, listed: listed[packageName] }).toEqual({
            packageName,
            listed: section ? { section, license } : undefined,
          });
        }
      },
    );

    it('when a package has neither a license file nor a repository URL, then its line has no "(undefined)"', async () => {
      const { stderr } = await runCopyleftCommand([]);

      expect(stderr).not.toContain('(undefined)');
      expect(stderr).toMatch(/^- @callstack\/example-license-mit-or-gpl-3\.0: MIT OR GPL-3\.0-only$/m);
    });

    it.each([
      // scenario, expected exit code, root project, extra arguments
      ['Dual License of permissive licenses passes under the default OR Policy', 0, 'no-copyleft', []],
      [
        'Dual License of permissive licenses passes under least-restrictive',
        0,
        'no-copyleft',
        ['--or-policy', 'least-restrictive'],
      ],
      ['permissive packages pass with --error-on-weak', 0, 'no-copyleft', ['--error-on-weak']],
      ['weak copyleft combined with AND passes without --error-on-weak', 0, 'weak-copyleft-only', []],
      ['weak copyleft combined with AND fails with --error-on-weak', 2, 'weak-copyleft-only', ['--error-on-weak']],
      [
        'weak copyleft combined with AND fails with --error-on-weak under least-restrictive',
        2,
        'weak-copyleft-only',
        ['--or-policy', 'least-restrictive', '--error-on-weak'],
      ],
      [
        'Dual License with a strong copyleft operand fails under the default OR Policy',
        1,
        'copyleft-avoidable-by-or-policy',
        [],
      ],
      [
        'Dual License with a strong copyleft operand fails under most-restrictive',
        1,
        'copyleft-avoidable-by-or-policy',
        ['--or-policy', 'most-restrictive'],
      ],
      [
        'Dual License with a strong copyleft operand passes under least-restrictive',
        0,
        'copyleft-avoidable-by-or-policy',
        ['--or-policy', 'least-restrictive'],
      ],
      [
        'strong copyleft combined with AND fails under most-restrictive',
        1,
        'copyleft-unavoidable',
        ['--or-policy', 'most-restrictive'],
      ],
      [
        'strong copyleft combined with AND fails under least-restrictive, since AND ignores the OR Policy',
        1,
        'copyleft-unavoidable',
        ['--or-policy', 'least-restrictive'],
      ],
      ['strong copyleft with a License Exception fails', 1, 'with-exception', ['--or-policy', 'least-restrictive']],
      ['strong copyleft next to a LicenseRef-* license fails under the default OR Policy', 1, 'license-ref', []],
      [
        'strong copyleft next to a LicenseRef-* license fails under least-restrictive',
        1,
        'license-ref',
        ['--or-policy', 'least-restrictive'],
      ],
      ['Unknown Licenses alone do not fail', 0, 'unknown-licenses', []],
      ['Unknown Licenses alone do not fail with --error-on-weak', 0, 'unknown-licenses', ['--error-on-weak']],
    ] as [string, number, string, string[]][])('%s: exits with %d', async (_scenario, expectedExitCode, root, args) => {
      const { exitCode } = await runCopyleftCommand([
        '--root',
        path.join(FIXTURE_ROOTS_DIR, `example-copyleft-root-${root}`),
        ...args,
      ]);

      expect(exitCode).toBe(expectedExitCode);
    });

    it('when a package ships several license files, then its line lists all of them', async () => {
      const { stderr } = await runCopyleftCommand([]);
      const line = stderr.split('\n').find((l) => l.startsWith('- @callstack/example-license-mit-and-lgpl-2.1:'));

      expect(line).toMatch(/\(.*LICENSE-LGPL, .*LICENSE-MIT\)$/);
    });

    it('when a package has a License Exception, then the copyleft output shows the exception', async () => {
      const { stderr } = await runCopyleftCommand([
        '--root',
        path.join(FIXTURE_ROOTS_DIR, 'example-copyleft-root-with-exception'),
      ]);

      expect(parseCopyleftOutput(stderr)).toEqual({
        '@callstack/example-license-gpl-2.0-with-classpath-exception': {
          section: 'strong',
          license: 'GPL-2.0-only WITH Classpath-exception-2.0',
        },
      });
    });

    it('when OR Policy is not a supported value, then it prints the supported values and exits with 1', async () => {
      const { exitCode, stderr } = await runCopyleftCommand(['--or-policy', 'invalid']);

      expect(exitCode).toBe(1);
      expect(stderr).toMatch('Invalid OR policy: invalid. Supported policies: most-restrictive, least-restrictive');
    });
  });
});
