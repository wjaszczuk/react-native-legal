/**
 * Structured meaning of a package's Raw License, following the SPDX License Expression
 * syntax (SPDX spec v3.0.1, Annex B).
 *
 * The tree is binary: `A OR B OR C` is represented as `A OR (B OR C)`.
 *
 * @see https://spdx.github.io/spdx-spec/v3.0.1/annexes/spdx-license-expressions/
 */
export type LicenseExpression =
  /**
   * A single license, identified by its SPDX License Identifier (e.g. `MIT`).
   * - `id` is canonical: deprecated identifiers are upgraded and `+` is absorbed into `-or-later` when such an identifier exists
   * - `declaredId` and `plus` record what was written
   * - `exception` is the License Exception attached with `WITH`
   */
  | { kind: 'license'; id: string; declaredId: string; plus?: boolean; exception?: string }
  /** Dual License: the licensee may comply with either operand */
  | { kind: 'or'; left: LicenseExpression; right: LicenseExpression }
  /** Both operands apply and must be complied with simultaneously */
  | { kind: 'and'; left: LicenseExpression; right: LicenseExpression }
  /** Unknown License: missing, unparseable, or not a license grant; `raw` keeps the original value */
  | { kind: 'unknown'; raw: string | null };
