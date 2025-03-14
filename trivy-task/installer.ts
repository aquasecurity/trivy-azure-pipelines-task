import os from 'os';
import tool = require('azure-pipelines-tool-lib');
import task = require('azure-pipelines-task-lib/task');
import { stripV } from './utils';

const fallbackVersion = 'v0.60.0';
const releasesUri = 'https://github.com/aquasecurity/trivy/releases';

export async function installTrivy(version: string) {
  console.log(`Requested Trivy version to install: ${version}`);
  if (version === 'latest') {
    version = await getLatestVersion();
  }

  let cachedPath = tool.findLocalTool('trivy', version);
  if (!cachedPath) {
    const url = await getArtifactURL(version);
    const downloadPath = await tool.downloadTool(url);
    const extractPath =
      getPlatform() === 'windows'
        ? await tool.extractZip(downloadPath)
        : await tool.extractTar(downloadPath);
    cachedPath = await tool.cacheDir(extractPath, 'trivy', version);
  }
  tool.prependPath(cachedPath);
}

async function getLatestVersion(): Promise<string> {
  task.debug('Fetching latest version from GitHub...');
  const response = await fetch(
    new Request(`${releasesUri}/latest`, { redirect: 'manual' })
  );
  const locationHeader = response.headers.get('location');
  const version = locationHeader?.split('/')?.pop();
  if (!version) {
    task.warning(
      `Failed to retrieve latest version information from GitHub. Using fallback version: ${fallbackVersion}`
    );
    return fallbackVersion;
  }
  console.log(`Resolved version: ${version}`);
  return version;
}

async function getArtifactURL(version: string): Promise<string> {
  const arch = getArchitecture();
  const platform = getPlatform();
  const extension = platform === 'windows' ? '.zip' : '.tar.gz';
  return `${releasesUri}/download/${version}/trivy_${stripV(version)}_${platform}-${arch}${extension}`;
}

function getArchitecture(): string {
  switch (os.arch()) {
    case 'arm':
      return 'ARM';
    case 'arm64':
      return 'ARM64';
    case 'x32':
      return '32bit';
    case 'x64':
      return '64bit';
    default:
      throw new Error(`unsupported architecture: ${os.arch()}`);
  }
}

function getPlatform(): string {
  switch (os.platform()) {
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    case 'win32':
      return 'windows';
    default:
      throw new Error(`unsupported platform: ${os.platform()}`);
  }
}
