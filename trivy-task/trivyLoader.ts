import * as os from 'os';
import * as tool from 'azure-pipelines-tool-lib';
import axios from 'axios';
import process = require('process');
import task = require('azure-pipelines-task-lib/task');
import { hasAquaAccount, isDevMode, stripV } from './utils';
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';

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

  // Fail-fast on Microsoft Hosted agents on non-Linux platforms
  if (
    task.getAgentMode() === task.AgentHostedMode.MsHosted &&
    task.getPlatform() !== task.Platform.Linux
  ) {
    throw new Error('Running Trivy in docker is available on Linux only.');
  }
  return dockerRunner(version);
}

async function dockerRunner(version: string): Promise<ToolRunner> {
  console.log('Run requested using docker...');
  const runner = task.tool('docker');
  const loginDockerConfig = task.getBoolInput('loginDockerConfig', false);
  const home = os.homedir();
  const cwd = process.cwd();
  const dockerHome = home + '/.docker';
  const cacheDir = tmpPath + '.trivycache';

  // ensure the cache dir is created
  task.mkdirP(cacheDir);

  // ensure the docker home dir is created
  task.mkdirP(dockerHome);

  runner.line('run --rm');
  // Add the --user flag to run as the current user
  if (process.getuid && process.getgid) {
    runner.line(`--user ${process.getuid()}:${process.getgid()}`);
  }
  // Try to get the docker group id
  const dockerGidResult = task.execSync('getent', ['group', 'docker'], {
    silent: true,
  });
  if (dockerGidResult?.stdout) {
    const gid = dockerGidResult.stdout.split(':')[2];
    // Add the docker group id to the container to have access to the docker socket
    runner.line(`--group-add ${gid}`);
  }

  loginDockerConfig
    ? runner.line('-v ' + `${task.getVariable('DOCKER_CONFIG')}:/task/docker`)
    : runner.line('-v ' + `${dockerHome}:/task/docker`);
  runner.line(`-v ${tmpPath}:/tmp`);
  runner.line(`-v ${cacheDir}:/task/cache`);
  runner.line('-v /var/run/docker.sock:/var/run/docker.sock');
  runner.line(`-v ${cwd}:/src`);
  runner.line('--workdir /src');
  runner.line('-e TRIVY_CACHE_DIR=/task/cache');
  runner.line('-e DOCKER_CONFIG=/task/docker');

  if (hasAquaAccount()) {
    runner.line('-e TRIVY_RUN_AS_PLUGIN');
    runner.line('-e AQUA_KEY');
    runner.line('-e AQUA_SECRET');
    runner.line('-e OVERRIDE_REPOSITORY');
    runner.line('-e OVERRIDE_BRANCH');
    runner.line('-e AQUA_ASSURANCE_EXPORT');
    if (isDevMode()) {
      runner.line('-e AQUA_URL=https://api.dev.supply-chain.cloud.aquasec.com');
      runner.line('-e CSPM_URL=https://stage.api.cloudsploit.com');
    }
  }
  let trivyImage = task.getInput('trivyImage', false) ?? 'aquasec/trivy';
  if (trivyImage === 'aquasec/trivy') {
    trivyImage = `${trivyImage}:${stripV(version)}`;
  }
  console.log(`Using Trivy image: ${trivyImage}`);
  runner.line(trivyImage);

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
      return latestVersion;
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
