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
