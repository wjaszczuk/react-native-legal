import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readLicenseFiles } from '../licenseFiles';

function makePackage(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'license-files-'));

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }

  return dir;
}

describe('readLicenseFiles', () => {
  it('links LICENSE-MIT and LICENSE-APACHE of a Dual License to their License Identifiers', () => {
    const dir = makePackage({ 'LICENSE-MIT': 'mit text', 'LICENSE-APACHE': 'apache text' });

    expect(readLicenseFiles(dir, ['MIT', 'Apache-2.0'])).toEqual([
      { file: path.join(dir, 'LICENSE-APACHE'), content: 'apache text', licenseId: 'Apache-2.0' },
      { file: path.join(dir, 'LICENSE-MIT'), content: 'mit text', licenseId: 'MIT' },
    ]);
  });

  it('lists a single LICENSE file of a Dual License without a License Identifier', () => {
    const dir = makePackage({ LICENSE: 'both texts' });

    expect(readLicenseFiles(dir, ['MIT', 'Apache-2.0'])).toEqual([
      { file: path.join(dir, 'LICENSE'), content: 'both texts' },
    ]);
  });

  it('discovers LICENSE.txt, COPYING and case-insensitive names', () => {
    const dir = makePackage({ 'LICENSE.txt': 'a', COPYING: 'b', 'licence.md': 'c', 'README.md': 'no' });

    expect(readLicenseFiles(dir, ['MIT']).map(({ file }) => path.basename(file))).toEqual([
      'COPYING',
      'LICENSE.txt',
      'licence.md',
    ]);
  });

  it('does not link a file whose suffix matches no License Identifier or more than one', () => {
    const dir = makePackage({ 'LICENSE-FOO': 'a', 'LICENSE-GPL': 'b' });

    expect(readLicenseFiles(dir, ['GPL-2.0-only', 'GPL-3.0-only'])).toEqual([
      { file: path.join(dir, 'LICENSE-FOO'), content: 'a' },
      { file: path.join(dir, 'LICENSE-GPL'), content: 'b' },
    ]);
  });

  it('skips code and data files whose name merely starts with license', () => {
    const dir = makePackage({ 'license.js': 'x', 'licenses.json': '{}', LICENSE: 'text' });

    expect(readLicenseFiles(dir, ['MIT']).map(({ file }) => path.basename(file))).toEqual(['LICENSE']);
  });

  it('returns an empty list when the package ships no license file', () => {
    expect(readLicenseFiles(makePackage({ 'package.json': '{}' }), ['MIT'])).toEqual([]);
  });
});
