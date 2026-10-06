import { STRONG_COPYLEFT_LICENSES_LOWERCASE, WEAK_COPYLEFT_LICENSES_LOWERCASE } from '../constants';
import type { LicenseExpression } from '../types';

import { LicenseCategory } from './LicenseCategory';
import type { OrPolicy } from './OrPolicy';
import { DEFAULT_OR_POLICY } from './OrPolicy';

const CATEGORY_RANK: Record<LicenseCategory, number> = {
  [LicenseCategory.PERMISSIVE]: 0,
  [LicenseCategory.WEAK_COPYLEFT]: 1,
  [LicenseCategory.STRONG_COPYLEFT]: 2,
  [LicenseCategory.UNKNOWN]: 3,
};

const OR_COMPARISON_STRATEGY: Record<OrPolicy, (a: LicenseCategory, b: LicenseCategory) => LicenseCategory> = {
  'most-restrictive': takeMoreRestrictive,
  'least-restrictive': takeLessRestrictive,
};

/**
 * Categorizes a license based on its copyleft characteristics.
 * @param licenseType the license type
 * @returns the license category
 */
export function categorizeLicense(licenseType?: string): LicenseCategory {
  if (!licenseType || licenseType === 'unknown') {
    return LicenseCategory.UNKNOWN;
  }

  // check for strong copyleft licenses
  if (STRONG_COPYLEFT_LICENSES_LOWERCASE.has(licenseType.toLowerCase())) {
    return LicenseCategory.STRONG_COPYLEFT;
  }

  // check for weak copyleft licenses
  if (WEAK_COPYLEFT_LICENSES_LOWERCASE.has(licenseType.toLowerCase())) {
    return LicenseCategory.WEAK_COPYLEFT;
  }

  // everything else is considered permissive
  return LicenseCategory.PERMISSIVE;
}

/**
 * Classifies a License Expression into a License Category.
 *
 * Categories are ordered permissive < weak copyleft < strong copyleft < unknown:
 * - a license takes the category of its License Identifier;
 * - an Unknown License is unknown;
 * - AND always takes its most restrictive operand;
 * - OR takes the operand chosen by the OR Policy.
 *
 * @param expression the License Expression to classify
 * @param orPolicy the OR Policy applied to every OR in the expression; defaults to {@link DEFAULT_OR_POLICY}
 * @returns the License Category of the whole expression
 * @example
 * classifyLicenseExpression(parseLicenseExpression('MIT OR GPL-3.0-only'), 'least-restrictive');
 * // LicenseCategory.PERMISSIVE
 */
export function classifyLicenseExpression(
  expression: LicenseExpression,
  orPolicy: OrPolicy = DEFAULT_OR_POLICY,
): LicenseCategory {
  switch (expression.kind) {
    case 'license':
      return isLicenseRef(expression.id) ? LicenseCategory.UNKNOWN : categorizeLicense(expression.id);
    case 'unknown':
      return LicenseCategory.UNKNOWN;
    case 'and':
      return takeMoreRestrictive(
        classifyLicenseExpression(expression.left, orPolicy),
        classifyLicenseExpression(expression.right, orPolicy),
      );
    case 'or':
      return OR_COMPARISON_STRATEGY[orPolicy](
        classifyLicenseExpression(expression.left, orPolicy),
        classifyLicenseExpression(expression.right, orPolicy),
      );
  }
}

/**
 * Decides which copyleft cannot be avoided for a License Expression under an OR Policy.
 *
 * Unknown operands are ignored, so a custom license next to a copyleft one cannot hide the copyleft:
 * - AND requires the most restrictive known operand;
 * - OR with an Unknown operand requires what the other operand requires;
 * - OR with two known operands follows the OR Policy;
 * - an expression with no known operand requires no copyleft.
 *
 * @param expression the License Expression to check
 * @param orPolicy the OR Policy applied to every OR in the expression; defaults to {@link DEFAULT_OR_POLICY}
 * @returns permissive, weak copyleft or strong copyleft; never unknown
 * @example
 * classifyUnavoidableCopyleft(parseLicenseExpression('GPL-3.0-only AND LicenseRef-Custom'));
 * // LicenseCategory.STRONG_COPYLEFT
 */
export function classifyUnavoidableCopyleft(
  expression: LicenseExpression,
  orPolicy: OrPolicy = DEFAULT_OR_POLICY,
): LicenseCategory {
  return findKnownCopyleft(expression, orPolicy) ?? LicenseCategory.PERMISSIVE;
}

/** Like {@link classifyUnavoidableCopyleft}, but `null` when no operand has a known category */
function findKnownCopyleft(expression: LicenseExpression, orPolicy: OrPolicy): LicenseCategory | null {
  if (expression.kind === 'unknown') {
    return null;
  }

  if (expression.kind === 'license') {
    const category = classifyLicenseExpression(expression);

    return category === LicenseCategory.UNKNOWN ? null : category;
  }

  const left = findKnownCopyleft(expression.left, orPolicy);
  const right = findKnownCopyleft(expression.right, orPolicy);

  if (left === null || right === null) {
    return left ?? right;
  }

  return expression.kind === 'and' ? takeMoreRestrictive(left, right) : OR_COMPARISON_STRATEGY[orPolicy](left, right);
}

/** A custom license reference, optionally qualified by a document: `LicenseRef-X` or `DocumentRef-Y:LicenseRef-X` */
function isLicenseRef(id: string): boolean {
  return /^(DocumentRef-[^:]+:)?LicenseRef-/.test(id);
}

function takeMoreRestrictive(a: LicenseCategory, b: LicenseCategory): LicenseCategory {
  return CATEGORY_RANK[a] >= CATEGORY_RANK[b] ? a : b;
}

function takeLessRestrictive(a: LicenseCategory, b: LicenseCategory): LicenseCategory {
  return CATEGORY_RANK[a] <= CATEGORY_RANK[b] ? a : b;
}
