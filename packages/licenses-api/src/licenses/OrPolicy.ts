/**
 * Enumerates all valid OR Policy values
 *
 * @see {@link OrPolicy}
 */
export const validOrPolicies = ['most-restrictive', 'least-restrictive'] as const;

/**
 * Rule for which operand of a Dual License (`A OR B`) determines its License Category:
 * - 'most-restrictive' (the most restrictive operand)
 * - 'least-restrictive' (the least restrictive operand; matches SPDX's "choice" meaning of OR)
 *
 * Never applies to AND, which always takes the most restrictive operand.
 */
export type OrPolicy = (typeof validOrPolicies)[number];
