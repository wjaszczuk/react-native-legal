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
 * Categorizes a canonical License Identifier from a parsed License Expression.
 * Not for raw strings: an identifier outside the copyleft tables is assumed permissive,
 * which is only safe because the parser rejects unrecognised identifiers.
 */
function categorizeLicenseId(licenseId: string): LicenseCategory {
  if (STRONG_COPYLEFT_LICENSES_LOWERCASE.has(licenseId.toLowerCase())) {
    return LicenseCategory.STRONG_COPYLEFT;
  }

  if (WEAK_COPYLEFT_LICENSES_LOWERCASE.has(licenseId.toLowerCase())) {
    return LicenseCategory.WEAK_COPYLEFT;
  }

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
      return isLicenseRef(expression.id) ? LicenseCategory.UNKNOWN : categorizeLicenseId(expression.id);
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

/** The copyleft that cannot be avoided for a License Expression, see {@link classifyUnavoidableCopyleft} */
export interface UnavoidableCopyleft {
  /** The known copyleft that must be complied with, never unknown; permissive when no known operand requires copyleft */
  category: LicenseCategory;
  /** `true` when an Unknown operand could require more than `category`, so `category` is only a lower bound */
  unidentified: boolean;
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
 * Ignoring an Unknown operand can also understate the result (`MIT AND LicenseRef-Custom`, or an expression
 * that is wholly Unknown), so the result says when that happened: `unidentified` is `true` when an Unknown operand
 * could require more than the category under the OR Policy and the category is not already strong copyleft,
 * the most restrictive known category. `MIT OR LicenseRef-Custom` is only unidentified under the most restrictive OR Policy.
 *
 * @param expression the License Expression to check
 * @param orPolicy the OR Policy applied to every OR in the expression; defaults to {@link DEFAULT_OR_POLICY}
 * @returns the known copyleft category, and whether an Unknown operand leaves it unidentified
 * @example
 * classifyUnavoidableCopyleft(parseLicenseExpression('GPL-3.0-only AND LicenseRef-Custom'));
 * // { category: LicenseCategory.STRONG_COPYLEFT, unidentified: false }
 * @example
 * classifyUnavoidableCopyleft(parseLicenseExpression('MIT AND LicenseRef-Custom'));
 * // { category: LicenseCategory.PERMISSIVE, unidentified: true }
 */
export function classifyUnavoidableCopyleft(
  expression: LicenseExpression,
  orPolicy: OrPolicy = DEFAULT_OR_POLICY,
): UnavoidableCopyleft {
  const category = findKnownCopyleft(expression, orPolicy) ?? LicenseCategory.PERMISSIVE;

  return {
    category,
    unidentified: category !== LicenseCategory.STRONG_COPYLEFT && hasUnknownOperand(expression, orPolicy),
  };
}

/**
 * Whether an Unknown operand could require more than {@link findKnownCopyleft} found under the OR Policy.
 *
 * An OR with a known operand only has this risk under the most restrictive OR Policy: under the least restrictive
 * one the known operand can always be chosen instead of the Unknown one.
 */
function hasUnknownOperand(expression: LicenseExpression, orPolicy: OrPolicy): boolean {
  switch (expression.kind) {
    case 'unknown':
      return true;
    case 'license':
      return classifyLicenseExpression(expression, orPolicy) === LicenseCategory.UNKNOWN;
    case 'and':
      return hasUnknownOperand(expression.left, orPolicy) || hasUnknownOperand(expression.right, orPolicy);
    case 'or':
      return orPolicy === 'least-restrictive'
        ? hasUnknownOperand(expression.left, orPolicy) && hasUnknownOperand(expression.right, orPolicy)
        : hasUnknownOperand(expression.left, orPolicy) || hasUnknownOperand(expression.right, orPolicy);
  }
}

/** Like {@link classifyUnavoidableCopyleft}, but `null` when no operand has a known category */
function findKnownCopyleft(expression: LicenseExpression, orPolicy: OrPolicy): LicenseCategory | null {
  if (expression.kind === 'unknown') {
    return null;
  }

  if (expression.kind === 'license') {
    const category = classifyLicenseExpression(expression, orPolicy);

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
