import path from 'node:path';

import { type Types, generateAboutLibrariesNPMOutput, renderLicenseExpression } from '@callstack/licenses';
import * as md from 'ts-markdown-builder';

import type { Format } from './types/Format';
import { formatLicenseFileNames } from './utils/licenseFileUtils';

export function serializeReport({
  licenses,
  format,
}: {
  licenses: Types.AggregatedLicensesMapping;
  format: Format;
}): string {
  // convert absolute paths to license files to just filenames (no point in placing those in the file)
  for (const packageInfo of Object.values(licenses)) {
    for (const licenseFile of packageInfo.licenseFiles) {
      licenseFile.file = path.basename(licenseFile.file);
    }
  }

  const licenseTexts = (packageInfo: Types.License) =>
    packageInfo.licenseFiles.length > 1
      ? packageInfo.licenseFiles
          .map(({ file, content, licenseId }) => `${licenseId ?? file}:\n\n${content}`)
          .join('\n\n')
      : packageInfo.licenseFiles[0]?.content;

  switch (format) {
    default:
    case 'json':
      return JSON.stringify(licenses, null, 2);

    case 'about-json':
      return JSON.stringify(generateAboutLibrariesNPMOutput(licenses), null, 2);

    case 'text':
      return Object.values(licenses)
        .map((packageInfo) => {
          const { name: packageName, version, author, description, license, licenseFiles, url } = packageInfo;

          return [
            `${packageName} (${version})`,
            url ? `URL: ${url}` : '',
            author ? `Author: ${author}` : '',
            licenseTexts(packageInfo) ?? '',
            description ? `Description: ${description}` : '',
            licenseFiles.length > 0 ? `File: ${formatLicenseFileNames(licenseFiles)}` : '',
            `Type: ${renderLicenseExpression(license)}`,
            '',
            '---'.repeat(10),
            '',
          ].join('\n');
        })
        .join('\n');

    case 'markdown':
      return md
        .joinBlocks(
          Object.values(licenses)
            .flatMap((packageInfo) => {
              const { name: packageName, version, author, description, license, licenseFiles, url } = packageInfo;

              return [
                '\n',
                md.heading(packageName, { level: 2 }),
                '\n',
                `Version: ${version}<br/>\n`,
                url ? `URL: ${url}<br/>\n` : '',
                author ? `Author: ${author}<br/>\n\n` : '',
                licenseTexts(packageInfo) ?? '',
                '\n',
                description ? `Description: ${description}\n` : '',
                licenseFiles.length > 0 ? `\nFile: ${formatLicenseFileNames(licenseFiles)}\n` : '',
                `Type: ${renderLicenseExpression(license)}`,
                '\n',
                md.horizontalRule,
              ];
            })
            .join('\n'),
        )
        .toString();
  }
}
