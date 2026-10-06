import fs from 'fs';
import path from 'path';

import { renderLicenseExpression } from '../../licenses';
import type { License, LicenseExpression, ScanPackageOptionsFactory } from '../../types';
import { normalizeRepositoryUrl } from '../../utils/repositoryUtils';

import { sha512 } from './miscUtils';

export { readLicenseFiles } from './licenseFiles';

export function getPackageJsonPath(dependency: string, root?: string) {
  const rootsToSearch = [
    ...(root ? [root] : []), // provided for purpose of nested node_modules resolution inside a package dir, in a subdirectory inside the root node_modules dir
    process.cwd(), // fallback - root node_modules directory home
  ]; // in order of priority (left-to-right)

  try {
    return require.resolve(`${dependency}/package.json`, { paths: rootsToSearch });
  } catch (error) {
    for (const root of rootsToSearch) {
      const pkgJsonInNodeModules = path.join(root, 'node_modules', dependency, 'package.json');

      if (fs.existsSync(pkgJsonInNodeModules)) {
        return pkgJsonInNodeModules;
      }
    }

    return resolvePackageJsonFromEntry(dependency); // final fallback
  }
}

export function resolvePackageJsonFromEntry(dependency: string) {
  try {
    const entryPath = require.resolve(dependency);
    const packageDir = findPackageRoot(entryPath);

    if (!packageDir) return null;

    const packageJsonPath = path.join(packageDir, 'package.json');

    return fs.existsSync(packageJsonPath) ? packageJsonPath : null;
  } catch {
    return null;
  }
}

export function findPackageRoot(entryPath: string) {
  let currentDir = path.dirname(entryPath);
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) return currentDir;
    currentDir = path.dirname(currentDir);
  }
}

export function normalizePackageName(packageName: string): string {
  return packageName.replace('/', '_');
}

type LicenseLeaf = Extract<LicenseExpression, { kind: 'license' }>;

function collectLicenseLeaves(expression: LicenseExpression): LicenseLeaf[] {
  switch (expression.kind) {
    case 'license':
      return [expression];
    case 'and':
    case 'or':
      return [...collectLicenseLeaves(expression.left), ...collectLicenseLeaves(expression.right)];
    case 'unknown':
      return [];
  }
}

/**
 * One AboutLibraries license per License Identifier (or the Raw License when it is Unknown). Its name keeps
 * a retained `+` and the License Exception; its content is the linked license file, else every unlinked text
 * when the package has one license or exactly one unlinked text.
 */
export function prepareAboutLibrariesLicenses(license: License): { name: string; content: string }[] {
  const leaves = [...new Map(collectLicenseLeaves(license.license).map((leaf) => [leaf.id, leaf])).values()];
  const entries: { id?: string; name: string }[] =
    leaves.length > 0
      ? leaves.map((leaf) => ({ id: leaf.id, name: renderLicenseExpression(leaf) }))
      : license.rawLicense
        ? [{ name: license.rawLicense }]
        : license.licenseFiles.length > 0
          ? [{ name: renderLicenseExpression(license.license) }]
          : [];
  const unlinkedContents = license.licenseFiles.filter((file) => !file.licenseId).map((file) => file.content);

  return entries.map(({ id, name }) => ({
    name,
    content:
      license.licenseFiles.find((file) => id !== undefined && file.licenseId === id)?.content ??
      // a single license owns every text that is not linked to another one
      (entries.length === 1 || unlinkedContents.length === 1 ? unlinkedContents.join('\n\n') : ''),
  }));
}

export function prepareAboutLibrariesLicenseField(name: string, content?: string) {
  // The returned value is used as a filename under `android/config/licenses/`.
  // Legacy/compound SPDX expressions like `MIT/X11` or `(MIT OR Apache-2.0)` would
  // otherwise produce paths containing `/`, `(` or spaces, which causes the writer
  // to either fail with ENOENT (when a `/` is interpreted as a subdirectory) or
  // to produce names that are invalid on some filesystems.
  const sanitizedName = name.replace(/[^A-Za-z0-9._-]/g, '_');

  // hash the unsanitized name when there is no text, so that names differing only in sanitized characters stay distinct
  return `${sanitizedName}_${sha512(content || name)}`;
}

/**
 * LicensePlist body: every license text under a per-license heading (plain text, as LicensePlist shows
 * bodies verbatim); the rendered License Expression when there is no text.
 */
export function buildLicensePlistBody(license: License) {
  if (license.licenseFiles.length === 0) {
    return renderLicenseExpression(license.license);
  }

  return license.licenseFiles
    .map(({ file, content, licenseId }) => `=== ${licenseId ?? path.basename(file)} ===\n\n${content.trim()}`)
    .join('\n\n');
}

export function parseAuthorField(json: { author: string | { name: string } }) {
  if (typeof json.author === 'object' && typeof json.author.name === 'string') {
    return json.author.name;
  }

  if (typeof json.author === 'string') {
    return json.author;
  }
}

/**
 * Reads the Raw License from package.json: the `license` string, the legacy `license: { type }` object,
 * or the legacy `licenses: [{ type }, …]` array, whose types are joined with ` OR `.
 */
export function parseLicenseField(json: { license?: string | { type: string }; licenses?: Array<{ type?: string }> }) {
  if (typeof json.license === 'object' && typeof json.license?.type === 'string') {
    return json.license.type;
  }

  if (typeof json.license === 'string') {
    return json.license;
  }

  if (Array.isArray(json.licenses)) {
    const types = json.licenses.flatMap((entry) =>
      typeof entry?.type === 'string' && entry.type.trim() !== '' ? [entry.type] : [],
    );

    return types.length > 0 ? types.join(' OR ') : undefined;
  }
}

export function parseRepositoryFieldToUrl(json: { repository: string | { url?: string } }) {
  if (typeof json.repository === 'object' && typeof json.repository.url === 'string') {
    return normalizeRepositoryUrl(json.repository.url);
  }

  if (typeof json.repository === 'string') {
    return normalizeRepositoryUrl(json.repository);
  }
}

/**
 * Default value consistent with legacy behaviour assumptions for the scan package options factory
 * used so as not to introduce breaking API changes
 */
export const legacyDefaultScanPackageOptionsFactory: ScanPackageOptionsFactory = () => ({
  includeTransitiveDependencies: true,
  includeDevDependencies: false,
  includeOptionalDependencies: true,
});
