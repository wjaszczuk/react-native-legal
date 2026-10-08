import type { AggregatedLicensesMapping } from '../types';
import type { LicenseAnalysisResult } from '../types/LicenseAnalysisResult';

import { LicenseCategory } from './LicenseCategory';
import type { OrPolicy } from './OrPolicy';
import { DEFAULT_OR_POLICY } from './OrPolicy';
import { getGraphStateInfo } from './descriptions';
import { classifyLicenseExpression } from './licenseClassification';
import { renderLicenseExpression } from './licenseExpression';

/**
 * Analyzes license data and returns comprehensive statistics.
 *
 * Each package is classified by its License Expression and grouped by the rendered expression,
 * so a Dual License such as `MIT OR Apache-2.0` is counted under one key.
 *
 * @param report the licenses report data
 * @param orPolicy the OR Policy used to classify Dual Licenses; defaults to {@link DEFAULT_OR_POLICY}
 * @returns the license analysis result
 */
export function analyzeLicenses(
  report: AggregatedLicensesMapping,
  orPolicy: OrPolicy = DEFAULT_OR_POLICY,
): LicenseAnalysisResult {
  const byCategory: Record<LicenseCategory, number> = {
    [LicenseCategory.STRONG_COPYLEFT]: 0,
    [LicenseCategory.WEAK_COPYLEFT]: 0,
    [LicenseCategory.PERMISSIVE]: 0,
    [LicenseCategory.UNKNOWN]: 0,
  };

  const byLicense: Record<string, number> = {};
  const categoryByLicense: Record<string, LicenseCategory> = {};
  const categorizedLicenses: Record<string, LicenseCategory> = {};

  Object.entries(report).forEach(([packageKey, license]) => {
    const category = classifyLicenseExpression(license.license, orPolicy);
    const renderedLicense = renderLicenseExpression(license.license);

    // stats by category
    byCategory[category]++;

    // stats by specific license
    byLicense[renderedLicense] = (byLicense[renderedLicense] ?? 0) + 1;
    categoryByLicense[renderedLicense] = category;

    // memoization for lookup
    categorizedLicenses[packageKey] = category;
  });

  const total = Object.keys(report).length;

  const { categoriesPresence, description } = getGraphStateInfo(byCategory);

  return {
    total,
    byCategory,
    byLicense,
    categoryByLicense,
    description,
    categoriesPresence,
    categorizedLicenses,
  };
}
