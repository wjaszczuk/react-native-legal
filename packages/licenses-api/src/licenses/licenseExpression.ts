import spdxExceptionIds from 'spdx-exceptions/index.json';
import parse from 'spdx-expression-parse';
import deprecatedSpdxLicenseIds from 'spdx-license-ids/deprecated.json';
import spdxLicenseIds from 'spdx-license-ids/index.json';

import type { LicenseExpression } from '../types';

const SPDX_LICENSE_IDS = new Set(spdxLicenseIds);
const DEPRECATED_SPDX_LICENSE_IDS = new Set(deprecatedSpdxLicenseIds);

const CANONICAL_ID_BY_LOWERCASE = new Map(
  [...spdxLicenseIds, ...deprecatedSpdxLicenseIds, ...spdxExceptionIds].map((id) => [id.toLowerCase(), id]),
);

const SPDX_OPERATORS = new Set(['and', 'or', 'with']);

/**
 * Unambiguous spellings that are not valid SPDX License Expressions, keyed by the lowercase, trimmed value.
 * Ambiguous values (`BSD`, `GPL`, `LGPL`) are deliberately absent: guessing a variant or version changes the legal meaning.
 */
const LICENSE_ALIASES = new Map([
  ['apache 2.0', 'Apache-2.0'],
  ['apache-2', 'Apache-2.0'],
  ['apache license 2.0', 'Apache-2.0'],
  ['mit/x11', 'MIT'],
  ['mit license', 'MIT'],
]);

/**
 * Parses a Raw License into a License Expression, following the SPDX License Expression syntax.
 *
 * Never throws: a missing or unparseable value becomes an Unknown License that keeps the original value.
 *
 * @param rawLicense the license declaration as written in package.json, or `null` if absent
 * @returns the parsed License Expression
 * @example
 * parseLicenseExpression('MIT OR Apache-2.0');
 * // { kind: 'or', left: { kind: 'license', id: 'MIT', declaredId: 'MIT' }, right: { kind: 'license', id: 'Apache-2.0', declaredId: 'Apache-2.0' } }
 */
export function parseLicenseExpression(rawLicense: string | null): LicenseExpression {
  if (rawLicense === null) {
    return { kind: 'unknown', raw: rawLicense };
  }

  const parsed =
    tryParse(rawLicense) ??
    tryParse(LICENSE_ALIASES.get(rawLicense.trim().toLowerCase())) ??
    tryParse(fixIdentifierCase(rawLicense));

  return parsed ?? { kind: 'unknown', raw: rawLicense };
}

function tryParse(rawLicense: string | undefined): LicenseExpression | undefined {
  if (rawLicense === undefined) {
    return undefined;
  }

  try {
    return mapSpdxParsedValueToLicenseExpression(parse(rawLicense));
  } catch {
    return undefined;
  }
}

/**
 * Rewrites every identifier and operator to its canonical spelling (SPDX Annex B.2: identifiers are case-insensitive).
 * Tokens that match no known identifier are left as written, so the re-parse rejects them.
 */
function fixIdentifierCase(rawLicense: string): string {
  return rawLicense.replace(/[^\s()]+/g, (token) => {
    if (SPDX_OPERATORS.has(token.toLowerCase())) {
      return token.toUpperCase();
    }

    const plus = token.endsWith('+') ? '+' : '';
    const id = plus ? token.slice(0, -1) : token;
    const canonicalId =
      CANONICAL_ID_BY_LOWERCASE.get(id.toLowerCase()) ??
      (/^licenseref-/i.test(id) ? `LicenseRef-${id.slice('LicenseRef-'.length)}` : id);

    return `${canonicalId}${plus}`;
  });
}

function mapSpdxParsedValueToLicenseExpression(spdxParsedValue: parse.Info): LicenseExpression {
  if ('conjunction' in spdxParsedValue) {
    return {
      kind: spdxParsedValue.conjunction,
      left: mapSpdxParsedValueToLicenseExpression(spdxParsedValue.left),
      right: mapSpdxParsedValueToLicenseExpression(spdxParsedValue.right),
    };
  }

  const { license: declaredId, plus, exception } = spdxParsedValue;

  return {
    kind: 'license',
    id: normalizeLicenseId(declaredId, plus === true),
    declaredId,
    ...(plus && { plus: true }),
    ...(exception && { exception }),
  };
}

/**
 * Upgrades a declared License Identifier to its canonical form:
 * - with `+`, to the `-or-later` identifier when one exists;
 * - a deprecated identifier, to its `-only` identifier when one exists.
 */
function normalizeLicenseId(declaredId: string, plus: boolean): string {
  if (plus && SPDX_LICENSE_IDS.has(`${declaredId}-or-later`)) {
    return `${declaredId}-or-later`;
  }

  if (!plus && DEPRECATED_SPDX_LICENSE_IDS.has(declaredId) && SPDX_LICENSE_IDS.has(`${declaredId}-only`)) {
    return `${declaredId}-only`;
  }

  return declaredId;
}

/**
 * Collects the License Identifiers mentioned in a License Expression, regardless of how they are combined.
 *
 * @param expression the License Expression to flatten
 * @returns the License Identifiers in order of first appearance, without duplicates; empty for an Unknown License
 * @example
 * collectLicenseIds(parseLicenseExpression('(MIT OR ISC) AND (MIT OR Apache-2.0)'));
 * // ['MIT', 'ISC', 'Apache-2.0']
 */
export function collectLicenseIds(expression: LicenseExpression): string[] {
  switch (expression.kind) {
    case 'license':
      return [expression.id];
    case 'and':
    case 'or':
      return [...new Set([...collectLicenseIds(expression.left), ...collectLicenseIds(expression.right)])];
    case 'unknown':
      return [];
  }
}

/**
 * Renders a License Expression to a string, following the SPDX License Expression syntax.
 *
 * Adds only the parentheses required by SPDX precedence and by the right-nesting of operator chains,
 * so that parsing the result gives back the same tree. An Unknown License renders as its original value
 * (or `unknown` when absent) and is not expected to parse back to the same tree.
 *
 * @param expression the License Expression to render
 * @returns the rendered License Expression
 * @example
 * renderLicenseExpression(parseLicenseExpression('(MIT OR Apache-2.0) AND ISC'));
 * // '(MIT OR Apache-2.0) AND ISC'
 */
export function renderLicenseExpression(expression: LicenseExpression): string {
  switch (expression.kind) {
    case 'unknown':
      return expression.raw ?? 'unknown';
    case 'or':
    case 'and': {
      const left = renderOperand(expression.left, expression.kind, 'left');
      const right = renderOperand(expression.right, expression.kind, 'right');

      return `${left} ${expression.kind.toUpperCase()} ${right}`;
    }

    case 'license':
      return renderLicenseLeaf(expression);
  }
}

function renderLicenseLeaf(leaf: Extract<LicenseExpression, { kind: 'license' }>): string {
  // `+` is already absorbed into an `-or-later` identifier
  const plus = leaf.plus && !leaf.id.endsWith('-or-later') ? '+' : '';
  const exception = leaf.exception ? ` WITH ${leaf.exception}` : '';

  return `${leaf.id}${plus}${exception}`;
}

function renderOperand(
  operand: LicenseExpression,
  parentKind: 'or' | 'and',
  operandPosition: 'left' | 'right',
): string {
  const rendered = renderLicenseExpression(operand);

  return shouldAddParenthesis(operand, parentKind, operandPosition) ? `(${rendered})` : rendered;
}

function shouldAddParenthesis(
  childExpression: LicenseExpression,
  parentKind: 'or' | 'and',
  childPosition: 'left' | 'right',
): boolean {
  return (
    (parentKind === 'and' && childExpression.kind === 'or') ||
    (childPosition === 'left' && parentKind === childExpression.kind)
  );
}
