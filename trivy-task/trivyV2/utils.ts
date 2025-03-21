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
