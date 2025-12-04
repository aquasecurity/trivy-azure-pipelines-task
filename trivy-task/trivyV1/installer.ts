import os from 'os';
import tool = require('azure-pipelines-tool-lib');
import task = require('azure-pipelines-task-lib/task');
import { stripV, TaskInputs } from './utils';

const fallbackVersion = 'v0.60.0';
const releasesUri = 'https://github.com/aquasecurity/trivy/releases';
let isInstalled = false;

export async function installTrivy(inputs: TaskInputs) {
  if (isInstalled) {
    // Skip installation if already installed
    return;
  }

  // if using the trivyUrl input, skip version resolution
  if (!inputs.trivyUrl) {
    console.log(`Requested Trivy version to install: ${inputs.version}`);
    if (inputs.version === 'latest') {
      inputs.version = await getLatestVersion();
    }
  }

  let cachedPath = tool.findLocalTool('trivy', inputs.version);
  if (!cachedPath) {
    const url = await getArtifactURL(inputs);

    if (process.env.NODE_EXTRA_CA_CERTS) {
      task.debug(
        `NODE_EXTRA_CA_CERTS is set: ${process.env.NODE_EXTRA_CA_CERTS}`
      );
    }
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      task.debug(
        `NODE_TLS_REJECT_UNAUTHORIZED is set: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`
      );
    }

    const downloadPath = await tool.downloadTool(url);

    const extractPath =
      getPlatform() === 'windows'
        ? await tool.extractZip(downloadPath)
        : await tool.extractTar(downloadPath);
    cachedPath = await tool.cacheDir(extractPath, 'trivy', inputs.version);
  }
  tool.prependPath(cachedPath);
  isInstalled = true;
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

async function getArtifactURL(inputs: TaskInputs): Promise<string> {
  if (inputs.trivyUrl) {
    if (inputs.version === 'latest') {
      // fail the task because a specific version is required when using a custom URL
      throw new Error('A specific version is required when using a custom URL');
    }

    console.log(`Using custom Trivy URL: ${inputs.trivyUrl}`);
    return inputs.trivyUrl;
  }

  const arch = getArchitecture();
  const platform = getPlatform();
  const extension = platform === 'windows' ? 'zip' : 'tar.gz';
  return `https://get.trivy.dev/trivy?client=azure-pipeline&version=${stripV(inputs.version)}&os=${platform}&arch=${arch}&type=${extension}`;
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
