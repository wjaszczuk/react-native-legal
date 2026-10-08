import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  LicenseCategory,
  classifyUnavoidableCopyleft,
  renderLicenseExpression,
  scanDependencies,
} from '@callstack/licenses';
import type { Command } from 'commander';

import { ERROR_EMOJI, NON_TAB_HELP_LISTING_SUBLIST_OFFSET, WARNING_EMOJI } from '../constants';
import { createScanOptionsFactory } from '../scanOptionsUtils';
import {
  curryCommonScanOptions,
  curryOrPolicyOption,
  validateCommonScanOptions,
  validateOrPolicyOption,
} from '../utils/commandUtils';
import { formatLicenseFileNames } from '../utils/licenseFileUtils';

export default function copyleftCommandSetup(program: Command): Command {
  return curryOrPolicyOption(
    curryCommonScanOptions(
      program
        .command('copyleft')
        .description(
          'Check for copyleft licenses. Exits with error if strong copyleft licenses are found.' +
            '\nExit codes:' +
            `\n${NON_TAB_HELP_LISTING_SUBLIST_OFFSET}- 0 - no copyleft licenses found` +
            `\n${NON_TAB_HELP_LISTING_SUBLIST_OFFSET}- 1 - strong copyleft licenses found` +
            `\n${NON_TAB_HELP_LISTING_SUBLIST_OFFSET}- 2 - weak copyleft licenses found (if --error-on-weak is set)` +
            `\n${NON_TAB_HELP_LISTING_SUBLIST_OFFSET}- 3 - copyleft could not be ruled out because some licenses could not be identified (if --error-on-unidentified is set)`,
        )
        .option('--error-on-weak', 'Exit with error if weak copyleft licenses are found', false)
        .option(
          '--error-on-unidentified',
          'Exit with error if copyleft cannot be ruled out because some licenses could not be identified',
          false,
        )
        .option('--root [path]', 'Path to the root of your project', '.'),
    ),
  ).action((options) => {
    validateCommonScanOptions(options);
    validateOrPolicyOption(options);

    const repoRootPath = path.resolve(process.cwd(), options.root);
    const packageJsonPath = path.join(repoRootPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.error(`package.json not found at ${packageJsonPath}`);
      process.exit(1);
    }

    const licenses = scanDependencies(packageJsonPath, createScanOptionsFactory(options));

    const strongCopyleftLicensesFound: string[] = [];
    const weakCopyleftLicensesFound: string[] = [];
    const unidentifiedLicensesFound: string[] = [];

    for (const value of Object.values(licenses)) {
      const { category: licenseCategory, unidentified } = classifyUnavoidableCopyleft(value.license, options.orPolicy);
      // every license file, as a package may ship a copyleft text next to a permissive one
      const source = value.licenseFiles.length > 0 ? formatLicenseFileNames(value.licenseFiles) : value.url;
      const entry = `- ${value.name}: ${renderLicenseExpression(value.license)}${source ? ` (${source})` : ''}`;

      if (licenseCategory === LicenseCategory.STRONG_COPYLEFT) {
        strongCopyleftLicensesFound.push(entry);
      }

      if (licenseCategory === LicenseCategory.WEAK_COPYLEFT) {
        weakCopyleftLicensesFound.push(entry);
      }

      if (unidentified) {
        unidentifiedLicensesFound.push(entry);
      }
    }

    let exitCode = 0,
      noCopyleftLicensesFound = true;

    if (strongCopyleftLicensesFound.length > 0) {
      console.error(`${ERROR_EMOJI} Copyleft licenses found in the following dependencies:`);

      strongCopyleftLicensesFound.forEach((entry) => {
        console.error(entry);
      });

      exitCode = 1;
      noCopyleftLicensesFound = false;
    }

    if (weakCopyleftLicensesFound.length > 0) {
      console.error(
        `${
          options.errorOnWeak ? ERROR_EMOJI : WARNING_EMOJI
        } Weak copyleft licenses found in the following dependencies:`,
      );

      weakCopyleftLicensesFound.forEach((entry) => {
        (options.errorOnWeak ? console.error : console.warn)(entry);
      });

      if (options.errorOnWeak) {
        exitCode = 2;
      }

      noCopyleftLicensesFound = false;
    }

    if (unidentifiedLicensesFound.length > 0) {
      console.error(
        `${
          options.errorOnUnidentified ? ERROR_EMOJI : WARNING_EMOJI
        } Copyleft could not be ruled out for the following dependencies, as their license could not be identified (at least in part):`,
      );

      unidentifiedLicensesFound.forEach((entry) => {
        (options.errorOnUnidentified ? console.error : console.warn)(entry);
      });

      // never masks the exit code of strong or weak copyleft
      if (options.errorOnUnidentified && exitCode === 0) {
        exitCode = 3;
      }
    }

    if (noCopyleftLicensesFound) {
      console.log('✅ No copyleft licenses found');
    }

    if (exitCode != 0) {
      process.exit(exitCode);
    }
  });
}
