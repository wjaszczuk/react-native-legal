import { renderLicenseExpression } from '../../licenses';
import type { License, LicenseExpression } from '../../types';

import { sha512 } from './miscUtils';

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

function getAboutLibrariesEntries(license: License): { id?: string; name: string }[] {
  const leavesById = new Map(collectLicenseLeaves(license.license).map((leaf) => [leaf.id, leaf]));

  if (leavesById.size > 0) {
    return [...leavesById.values()].map((leaf) => ({ id: leaf.id, name: renderLicenseExpression(leaf) }));
  }

  // Unknown License: the Raw License is the best name we have
  if (license.rawLicense) {
    return [{ name: license.rawLicense }];
  }

  // nothing declared, but the package ships a license text, so keep it
  if (license.licenseFiles.length > 0) {
    return [{ name: renderLicenseExpression(license.license) }];
  }

  return [];
}

/**
 * One AboutLibraries license per License Identifier (or the Raw License when it is Unknown). Its name keeps
 * a retained `+` and the License Exception; its content is the linked license file, else every unlinked text
 * when the package has one license or exactly one unlinked text.
 */
export function prepareAboutLibrariesLicenses(license: License): { name: string; content: string }[] {
  const entries = getAboutLibrariesEntries(license);
  const unlinkedTexts = license.licenseFiles.filter((file) => !file.licenseId).map((file) => file.content);

  // unlinked texts go to every license when there is only one text (it may cover all of them),
  // or when there is only one license (it owns every text)
  const sharedContent = entries.length === 1 || unlinkedTexts.length === 1 ? unlinkedTexts.join('\n\n') : '';

  return entries.map(({ id, name }) => ({
    name,
    content: (id ? license.licenseFiles.find((file) => file.licenseId === id)?.content : undefined) ?? sharedContent,
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
