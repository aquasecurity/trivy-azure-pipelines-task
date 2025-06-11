/**
 * Strips the 'v' prefix from a version string.
 * @param version - The version string to strip.
 * @returns The version string without the 'v' prefix.
 */
export function stripV(version: string): string {
  if (version.startsWith('v')) {
    version = version.substring(1);
  }
  return version;
}

export const severityLevels = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function getHighestSeverityLevel(resultFilePath: string): string {
  let highestIndex = -1;

  try {
    const data = require(resultFilePath);
    if (data && data.Results) {
      for (const result of data.Results) {
        if (result.Vulnerabilities) {
          for (const vulnerability of result.Vulnerabilities) {
            const severity = vulnerability.Severity;
            const index = severityLevels.indexOf(severity);
            if (index > highestIndex) {
              highestIndex = index;
            }
          }
        }
        if (result.Misconfigurations) {
          for (const misconfiguration of result.Misconfigurations) {
            const severity = misconfiguration.Severity;
            const index = severityLevels.indexOf(severity);
            if (index > highestIndex) {
              highestIndex = index;
            }
          }
        }
        if (result.Secrets) {
          for (const secret of result.Secrets) {
            const severity = secret.Severity;
            const index = severityLevels.indexOf(severity);
            if (index > highestIndex) {
              highestIndex = index;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading or parsing the result file: ${error}`);
  }

  return highestIndex >= 0 ? severityLevels[highestIndex] : '';
}
