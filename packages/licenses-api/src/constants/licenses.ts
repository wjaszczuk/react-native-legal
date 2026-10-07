/**
 * https://spdx.org/licenses
 *
 * Canonical License Identifiers, as produced by parsing a License Expression: deprecated identifiers are upgraded
 * (`GPL-2.0` becomes `GPL-2.0-only`) and `+` is absorbed (`GPL-2.0+` becomes `GPL-2.0-or-later`), so neither form is listed.
 * The exception are deprecated identifiers with a built-in License Exception, which have no `-only` form.
 */

export const STRONG_COPYLEFT_LICENSES = new Set([
  'GPL-1.0-only',
  'GPL-1.0-or-later',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-2.0-with-autoconf-exception',
  'GPL-2.0-with-bison-exception',
  'GPL-2.0-with-classpath-exception',
  'GPL-2.0-with-font-exception',
  'GPL-2.0-with-GCC-exception',
  'GPL-3.0-with-autoconf-exception',
  'GPL-3.0-with-GCC-exception',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-1.0-only',
  'AGPL-1.0-or-later',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'EUPL-1.0',
  'EUPL-1.1',
  'EUPL-1.2',
  'OSL-1.0',
  'OSL-1.1',
  'OSL-2.0',
  'OSL-2.1',
  'OSL-3.0',
]);

export const WEAK_COPYLEFT_LICENSES = new Set([
  'CDDL-1.0',
  'CDDL-1.1',
  'EPL-1.0',
  'EPL-2.0',
  'LGPL-2.0-only',
  'LGPL-2.0-or-later',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'MPL-1.1',
  'MPL-2.0',
]);

export const STRONG_COPYLEFT_LICENSES_LOWERCASE = new Set(
  Array.from(STRONG_COPYLEFT_LICENSES).map((license) => license.toLowerCase()),
);

export const WEAK_COPYLEFT_LICENSES_LOWERCASE = new Set(
  Array.from(WEAK_COPYLEFT_LICENSES).map((license) => license.toLowerCase()),
);
