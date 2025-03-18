import os from 'os';
import path from 'path';
import task = require('azure-pipelines-task-lib/task');
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { installTrivy } from './installer';
import { TaskInputs, hasAquaAccount, stripV } from './utils';

const agentTmp = task.getVariable('Agent.TempDirectory') ?? os.tmpdir();
export const tmpPath = path.join(agentTmp, 'trivy');

export async function createRunner(inputs: TaskInputs): Promise<ToolRunner> {
  // ensure the temp dir is created
  task.mkdirP(tmpPath);

  if (inputs.docker) {
    return dockerRunner(inputs);
  }

  if (inputs.useSystem) {
    console.log('Run requested using system Trivy binary...');
  } else {
    await installTrivy(inputs.version);
  }
  return task.tool('trivy');
}

async function dockerRunner(inputs: TaskInputs): Promise<ToolRunner> {
  console.log('Run requested using docker...');
  validateDockerOnNonLinux();
  const runner = task.tool('docker');
  const cwd = process.cwd();
  const dockerHome = path.join(os.homedir(), '.docker');
  const dockerConfig = inputs.loginDockerConfig
    ? (task.getVariable('DOCKER_CONFIG') ?? dockerHome)
    : dockerHome;

  // ensure the docker home dir is created with agent ownership
  task.mkdirP(dockerHome);

  runner.line('run --rm');
  setDockerNonRootUser(runner);
  runner.line('-v /var/run/docker.sock:/var/run/docker.sock');
  runner.line(`-v ${dockerConfig}:${dockerConfig}`);
  runner.line(`-v ${tmpPath}:${tmpPath}`);
  runner.line(`-v ${cwd}:${cwd}`);
  runner.line(`--workdir ${cwd}`);
  runner.line(`-e TRIVY_CACHE_DIR=${tmpPath}`);
  runner.line(`-e DOCKER_CONFIG=${dockerConfig}`);

  if (hasAquaAccount(inputs)) {
    runner.line('-e TRIVY_RUN_AS_PLUGIN');
    runner.line('-e AQUA_KEY');
    runner.line('-e AQUA_SECRET');
    runner.line('-e OVERRIDE_REPOSITORY');
    runner.line('-e OVERRIDE_BRANCH');
    runner.line('-e AQUA_ASSURANCE_EXPORT');
    if (inputs.devMode) {
      runner.line('-e AQUA_URL=https://api.dev.supply-chain.cloud.aquasec.com');
      runner.line('-e CSPM_URL=https://stage.api.cloudsploit.com');
    }
  }
  const trivyImage =
    inputs.trivyImage === 'aquasec/trivy'
      ? `${inputs.trivyImage}:${stripV(inputs.version)}`
      : inputs.trivyImage;
  console.log(`Using Trivy image: ${trivyImage}`);
  runner.line(trivyImage);

  return runner;
}

// Non-Linux MS Hosted agents do not support docker
function validateDockerOnNonLinux() {
  if (
    task.getAgentMode() === task.AgentHostedMode.MsHosted &&
    task.getPlatform() !== task.Platform.Linux
  ) {
    throw new Error(
      'Running Trivy in docker is unavailable on non-Linux Microsoft agents.'
    );
  }
}

// Run docker image as non-root agent user
function setDockerNonRootUser(runner: ToolRunner) {
  // Skip if not running on Linux
  if (task.getPlatform() !== task.Platform.Linux) {
    return;
  }
  // Add the --user flag to run the container as the same user as the agent
  if (process.getuid && process.getgid) {
    runner.line(`--user ${process.getuid()}:${process.getgid()}`);
  }

  // Add the --group-add flag to add the docker group
  const dockerGidResult = task.execSync('getent', ['group', 'docker'], {
    silent: true,
  });

  if (dockerGidResult?.stdout) {
    const gid = dockerGidResult.stdout.split(':')[2];
    runner.line(`--group-add ${gid}`);
  }
}
