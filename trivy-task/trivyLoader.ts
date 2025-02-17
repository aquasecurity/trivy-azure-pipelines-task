import * as os from 'os';
import * as util from 'util';
import * as tool from 'azure-pipelines-tool-lib';
import axios from 'axios';
import task = require('azure-pipelines-task-lib/task');
import { hasAquaAccount, isDevMode, stripV } from './utils';
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { homedir } from 'os';

const fallbackTrivyVersion = 'v0.59.1';
let trivyPath: string | undefined = undefined;
export const tmpPath = task.getVariable('Agent.TempDirectory') + '/';
const toolsDirectory = task.getVariable('Agent.ToolsDirectory') + '/';

export async function createRunner(): Promise<ToolRunner> {
  const docker = task.getBoolInput('docker', false);

  const version: string | undefined = task.getInput('version', true);
  const useSystemInstallation: boolean = task.getBoolInput(
    'useSystemInstallation',
    false
  );
  if (version === undefined) {
    throw new Error('version is not defined');
  }

  if (!docker) {
    if (!useSystemInstallation) {
      console.log('Run requested using local Trivy binary...');
      // ensure that the path is created
      task.mkdirP(tmpPath);
      if (!trivyPath) {
        trivyPath = await installTrivy(version);
      }
      return task.tool(trivyPath);
    } else {
      try {
        console.log('Run requested using system Trivy binary...');
        const trivyPath = task.which('trivy', true);
        return task.tool(trivyPath);
      } catch (err) {
        throw new Error('Failed to find trivy tool in system paths.');
      }
    }
  }

  console.log('Run requested using docker...');
  const runner = task.tool('docker');
  const loginDockerConfig = task.getBoolInput('loginDockerConfig', false);
  const home = homedir();
  const cwd = process.cwd();
  const dockerHome = home + '/.docker';

  // ensure the docker home dir is created
  task.mkdirP(dockerHome);

  runner.line('run --rm');
  loginDockerConfig
    ? runner.line('-v ' + `${task.getVariable('DOCKER_CONFIG')}:/root/.docker`)
    : runner.line('-v ' + `${dockerHome}:/root/.docker`);
  runner.line(`-v ${tmpPath}:/tmp`);
  runner.line('-v /var/run/docker.sock:/var/run/docker.sock');
  runner.line(`-v ${cwd}:/src`);
  runner.line('--workdir /src');

  if (hasAquaAccount()) {
    runner.line('-e TRIVY_RUN_AS_PLUGIN');
    runner.line('-e AQUA_KEY');
    runner.line('-e AQUA_SECRET');
    runner.line('-e OVERRIDE_REPOSITORY');
    runner.line('-e OVERRIDE_BRANCH');
    runner.line('-e AQUA_ASSURANCE_EXPORT');
    if (isDevMode()) {
      runner.line('-e AQUA_URL=https://api-dev.aquasec.com/v2/build');
      runner.line('-e CSPM_URL=https://stage.api.cloudsploit.com/v2/tokens');
    }
  }
  runner.line('aquasec/trivy:' + stripV(version));
  return runner;
}

async function installTrivy(version: string): Promise<string> {
  console.log('Finding correct Trivy version to install...');

  if (os.platform() == 'win32') {
    throw new Error('Windows is not currently supported');
  }
  if (os.platform() != 'linux') {
    throw new Error('Only Linux is currently supported');
  }

  if (version === 'latest') {
    task.debug('version set to latest, fetching latest version from GitHub');
    version = await getLatestTrivyVersion();
  }
  const bin = `trivy_${stripV(version).replaceAll('.', '_')}`;
  const binPath = toolsDirectory + bin;

  if (task.exist(binPath)) {
    console.log('Trivy already installed, skipping installation');
    return binPath;
  }

  const url = await getArtifactURL(version);
  console.log('Downloading Trivy...');
  const downloadPath = await tool.downloadTool(url);

  console.log('Extracting Trivy...');
  await tool.extractTar(downloadPath, tmpPath);
  console.log('Setting permissions...');
  task.mv(tmpPath + 'trivy', binPath);
  task.execSync('chmod', ['+x', binPath]);
  return binPath;
}

async function getArtifactURL(version: string): Promise<string> {
  const arch = getArchitecture();
  const artifact = `trivy_${stripV(version)}_Linux-${arch}.tar.gz`;
  return `https://github.com/aquasecurity/trivy/releases/download/${version}/${artifact}`;
}

async function getLatestTrivyVersion(): Promise<string> {
  try {
    console.log('Fetching latest Trivy version from GitHub...');
    const response = await axios.get(
      'https://github.com/aquasecurity/trivy/releases/latest',
      {
        maxRedirects: 0,
        validateStatus: (status) => status >= 300 && status < 400,
      }
    );
    task.debug(`Response: ${JSON.stringify(response.headers)}`);
    const location = response.headers['location'];
    if (!location) {
      throw new Error(
        'Failed to retrieve latest version information from GitHub'
      );
    }

    const parts = location?.split('/');
    if (parts) {
      const latestVersion = parts[parts.length - 1];
      console.log(`Latest Trivy version is ${latestVersion}`);
    }
  } catch (error) {
    console.log(
      `Unable to Retrieve Latest Version information from GitHub, falling back to ${fallbackTrivyVersion}`
    );
    if (error) {
      console.log(`Error: ${error}`);
    }
  }
  return fallbackTrivyVersion;
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
