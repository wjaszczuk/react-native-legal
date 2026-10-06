import path from 'node:path';

import { type Types, generateAboutLibrariesNPMOutput } from '@callstack/licenses';
import * as md from 'ts-markdown-builder';

import type { Format } from './types/Format';

export function serializeReport({
  licenses,
  format,
}: {
  licenses: Types.AggregatedLicensesMapping;
  format: Format;
}): string {
  // convert absolute paths to license files to just filenames (no point in placing those in the file)
  for (const packageInfo of Object.values(licenses)) {
    if (packageInfo.file) {
      packageInfo.file = path.basename(packageInfo.file);
    }

    for (const licenseFile of packageInfo.licenseFiles) {
      licenseFile.file = path.basename(licenseFile.file);
    }
  }

  const licenseTexts = (packageInfo: Types.License) =>
    packageInfo.licenseFiles.length > 1
      ? packageInfo.licenseFiles
          .map(({ file, content, licenseId }) => `${licenseId ?? file}:\n\n${content}`)
          .join('\n\n')
      : packageInfo.content;

  switch (format) {
    default:
    case 'json':
      return JSON.stringify(licenses, null, 2);

    case 'about-json':
      return JSON.stringify(generateAboutLibrariesNPMOutput(licenses), null, 2);

    case 'text':
      return Object.values(licenses)
        .map((packageInfo) => {
          const { name: packageName, version, author, description, file, type, url } = packageInfo;

          return [
            `${packageName} (${version})`,
            url ? `URL: ${url}` : '',
            author ? `Author: ${author}` : '',
            licenseTexts(packageInfo) ?? '',
            description ? `Description: ${description}` : '',
            file ? `File: ${file}` : '',
            type ? `Type: ${type}` : '',
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
              const { name: packageName, version, author, description, file, type, url } = packageInfo;

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
                file ? `\nFile: ${file}\n` : '',
                type ? `Type: ${type}` : '',
                '\n',
                md.horizontalRule,
              ];
            })
            .join('\n'),
        )
        .toString();
  }
}
