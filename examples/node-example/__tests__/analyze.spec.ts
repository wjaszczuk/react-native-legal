import path from 'node:path';

import { runLicenseKit } from '../__utils__/utils';

const FIXTURE_ROOTS_DIR = path.resolve(__dirname, '..', '..', 'packages');

type CategoryCounts = { strong: number; weak: number; unknown: number; permissive: number };

function runAnalyzeCommand(root: string, args: string[] = []) {
  return runLicenseKit(['analyze', '--root', path.join(FIXTURE_ROOTS_DIR, `example-copyleft-root-${root}`), ...args]);
}

function parseCategoryCounts(stdout: string): CategoryCounts {
  const count = (label: string) => Number(stdout.match(new RegExp(`${label}: (\\d+)`))?.[1]);

  return {
    strong: count('Copyleft licenses'),
    weak: count('Weak copyleft licenses'),
    unknown: count('Unknown licenses'),
    permissive: count('Permissive licenses'),
  };
}

describe('license-kit analyze', () => {
  describe('with --or-policy', () => {
    it.each([
      // root project, OR Policy -> expected category counts
      // Both packages of this project are Dual Licenses with a strong copyleft operand.
      ['copyleft-avoidable-by-or-policy', 'most-restrictive', { strong: 2, weak: 0, unknown: 0, permissive: 0 }],
      ['copyleft-avoidable-by-or-policy', 'least-restrictive', { strong: 0, weak: 0, unknown: 0, permissive: 2 }],
      // AND ignores the OR Policy
      ['copyleft-unavoidable', 'most-restrictive', { strong: 1, weak: 0, unknown: 0, permissive: 0 }],
      ['copyleft-unavoidable', 'least-restrictive', { strong: 1, weak: 0, unknown: 0, permissive: 0 }],
      // LGPL-2.1-only AND LicenseRef-Custom: Unknown is the most restrictive category
      ['weak-and-unidentified', 'most-restrictive', { strong: 0, weak: 0, unknown: 1, permissive: 0 }],
      ['weak-and-unidentified', 'least-restrictive', { strong: 0, weak: 0, unknown: 1, permissive: 0 }],
    ] as [string, string, CategoryCounts][])(
      'when root is %s and OR Policy is %s, then the category counts are %j',
      async (root, orPolicy, expected) => {
        const { exitCode, stdout } = await runAnalyzeCommand(root, ['--or-policy', orPolicy]);

        expect(exitCode).toBe(0);
        expect(parseCategoryCounts(stdout)).toEqual(expected);
      },
    );

    it('when OR Policy is omitted, then it defaults to most-restrictive', async () => {
      const { stdout } = await runAnalyzeCommand('copyleft-avoidable-by-or-policy');

      expect(parseCategoryCounts(stdout)).toEqual({ strong: 2, weak: 0, unknown: 0, permissive: 0 });
      expect(stdout).toMatch('Some detected licenses are strong-copyleft');
    });

    it('when OR Policy is least-restrictive, then the summary says all licenses are permissive', async () => {
      const { stdout } = await runAnalyzeCommand('copyleft-avoidable-by-or-policy', [
        '--or-policy',
        'least-restrictive',
      ]);

      expect(stdout).toMatch('All detected licenses are permissive');
    });

    it('when --show-breakdown is passed, then packages are grouped by the rendered License Expression and the OR Policy decides their category', async () => {
      const mostRestrictive = await runAnalyzeCommand('copyleft-avoidable-by-or-policy', [
        '--show-breakdown',
        '--or-policy',
        'most-restrictive',
      ]);
      const leastRestrictive = await runAnalyzeCommand('copyleft-avoidable-by-or-policy', [
        '--show-breakdown',
        '--or-policy',
        'least-restrictive',
      ]);

      for (const { stdout } of [mostRestrictive, leastRestrictive]) {
        expect(stdout).toMatch(/│ \(Apache-2\.0 OR LGPL-3\.0-only\) AND \(MIT OR GPL-2\.0-only\)\s+│ 1\s+│ 50\s+│/);
        expect(stdout).toMatch(/│ MIT OR GPL-3\.0-only\s+│ 1\s+│ 50\s+│/);
      }

      expect(mostRestrictive.stdout).toMatch(/example-license-mit-or-gpl-3\.0@1\.0\.0\s+│ strong copyleft/);
      expect(leastRestrictive.stdout).not.toMatch(/example-license-mit-or-gpl-3\.0@1\.0\.0/);
    });

    it('when a package has an Unknown License operand next to a known one, then it is listed as unknown with its Raw License', async () => {
      const { stdout } = await runAnalyzeCommand('weak-and-unidentified', ['--list-unknown']);

      expect(stdout).toMatch(
        /example-license-lgpl-2\.1-and-license-ref@1\.0\.0\s+│ LGPL-2\.1-only AND LicenseRef-Custom/,
      );
    });

    it('when OR Policy is not a supported value, then it prints the supported values and exits with 1', async () => {
      const { exitCode, stderr } = await runAnalyzeCommand('no-copyleft', ['--or-policy', 'invalid']);

      expect(exitCode).toBe(1);
      expect(stderr).toMatch('Invalid OR policy: invalid. Supported policies: most-restrictive, least-restrictive');
    });
  });
});
