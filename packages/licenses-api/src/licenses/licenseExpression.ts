import parse from 'spdx-expression-parse';

import type { LicenseExpression } from '../types';

/**
 * Parses a Raw License into a License Expression, following the SPDX License Expression syntax.
 *
 * Never throws: a missing or unparseable value becomes an Unknown License that keeps the original value.
 *
 * @param rawLicense the license declaration as written in package.json, or `null` if absent
 * @returns the parsed License Expression
 * @example
 * parseLicenseExpression('MIT OR Apache-2.0');
 * // { kind: 'or', left: { kind: 'license', id: 'MIT' }, right: { kind: 'license', id: 'Apache-2.0' } }
 */
export function parseLicenseExpression(rawLicense: string | null): LicenseExpression {
  if (rawLicense === null) {
    return { kind: 'unknown', raw: rawLicense };
  }

  try {
    const spdxParsedResult = parse(rawLicense);

    return mapSpdxParsedValueToLicenseExpression(spdxParsedResult);
  } catch {
    return { kind: 'unknown', raw: rawLicense };
  }
}

function mapSpdxParsedValueToLicenseExpression(spdxParsedValue: parse.Info): LicenseExpression {
  if ('conjunction' in spdxParsedValue) {
    return {
      kind: spdxParsedValue.conjunction,
      left: mapSpdxParsedValueToLicenseExpression(spdxParsedValue.left),
      right: mapSpdxParsedValueToLicenseExpression(spdxParsedValue.right),
    };
  }

  // TODO: implement exception and plus keys
  return { kind: 'license', id: spdxParsedValue.license };
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
      return expression.id;
  }
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
