import type { OrPolicy } from '@callstack/licenses';

import type { DevDepsMode } from '../types/DevDepsMode';
import type { Format } from '../types/Format';
import type { Output } from '../types/Output';
import type { TransitiveDepsMode } from '../types/TransitiveDepsMode';

export type CLIScanOptions = {
  transitiveDepsMode: TransitiveDepsMode;
  devDepsMode: DevDepsMode;
  includeOptionalDeps: boolean;
};

export type CLIReportOptions = {
  format: Format;
  output: Output;
  root: string;
};

export type CLIOrPolicyOptions = {
  orPolicy: OrPolicy;
};

export type CLIVisualizeOptions = CLIReportOptions & CLIScanOptions;
