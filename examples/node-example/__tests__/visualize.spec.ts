import { type ChildProcess, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

import { runLicenseKit } from '../__utils__/utils';

const FIXTURE_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  'packages',
  'example-copyleft-root-copyleft-avoidable-by-or-policy',
);

const SERVER_START_TIMEOUT_MS = 60_000;

function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;

      server.close(() => resolve(port));
    });
  });
}

/**
 * Starts `license-kit visualize` on a free port, fetches `/api/report` once the server is up and stops the server.
 */
async function fetchVisualizerReport(args: string[]) {
  const port = await getFreePort();

  let visualizer: ChildProcess | undefined;

  try {
    // detached, so that the whole process group (yarn and the CLI it spawns) can be stopped
    visualizer = spawn(
      'yarn',
      ['license-kit', 'visualize', '--auto-open', 'false', '--port', String(port), '--root', FIXTURE_ROOT, ...args],
      { detached: true, stdio: ['pipe', 'ignore', 'ignore'] },
    );

    const deadline = Date.now() + SERVER_START_TIMEOUT_MS;

    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://localhost:${port}/api/report`);

        if (response.ok) {
          return (await response.json()) as {
            report: Record<string, { rawLicense: string | null; license: { kind: string }; licenseIds: string[] }>;
            projectName: string;
            orPolicy: string;
          };
        }
      } catch {
        // the server is not listening yet
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`The visualizer did not respond within ${SERVER_START_TIMEOUT_MS}ms`);
  } finally {
    if (visualizer?.pid) {
      try {
        process.kill(-visualizer.pid, 'SIGTERM');
      } catch {
        // already stopped
      }
    }
  }
}

describe('license-kit visualize', () => {
  it.each(['most-restrictive', 'least-restrictive'])(
    'when --or-policy is %s, then the report served to the visualizer carries that OR Policy and the License Expressions',
    async (orPolicy) => {
      const { report, projectName, orPolicy: servedOrPolicy } = await fetchVisualizerReport(['--or-policy', orPolicy]);

      expect(servedOrPolicy).toBe(orPolicy);
      expect(projectName).toBe('@callstack/example-copyleft-root-copyleft-avoidable-by-or-policy');
      expect(
        Object.values(report)
          .map(({ rawLicense, licenseIds }) => ({ rawLicense, licenseIds }))
          .sort((a, b) => a.rawLicense!.localeCompare(b.rawLicense!)),
      ).toEqual([
        {
          rawLicense: '(Apache-2.0 OR LGPL-3.0-only) AND (MIT OR GPL-2.0-only)',
          licenseIds: ['Apache-2.0', 'LGPL-3.0-only', 'MIT', 'GPL-2.0-only'],
        },
        { rawLicense: 'MIT OR GPL-3.0-only', licenseIds: ['MIT', 'GPL-3.0-only'] },
      ]);
      expect(Object.values(report).every(({ license }) => license.kind === 'and' || license.kind === 'or')).toBe(true);
    },
    SERVER_START_TIMEOUT_MS + 10_000,
  );

  it(
    'when --or-policy is omitted, then the report served to the visualizer carries the default OR Policy',
    async () => {
      const { orPolicy } = await fetchVisualizerReport([]);

      expect(orPolicy).toBe('most-restrictive');
    },
    SERVER_START_TIMEOUT_MS + 10_000,
  );

  it('when OR Policy is not a supported value, then it prints the supported values and exits with 1', async () => {
    const { exitCode, stderr } = await runLicenseKit(['visualize', '--or-policy', 'invalid', '--auto-open', 'false']);

    expect(exitCode).toBe(1);
    expect(stderr).toMatch('Invalid OR policy: invalid. Supported policies: most-restrictive, least-restrictive');
  });
});
