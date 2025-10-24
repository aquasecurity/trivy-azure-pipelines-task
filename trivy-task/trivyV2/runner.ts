import os from 'os';
import path from 'path';
import task = require('azure-pipelines-task-lib/task');
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { installTrivy } from './installer';
import { TaskInputs } from './inputs';
import { stripV } from './utils';

const agentTmp = task.getVariable('Agent.TempDirectory') ?? os.tmpdir();
export const tmpPath = path.join(agentTmp, 'trivy');

export async function createRunner(inputs: TaskInputs): Promise<ToolRunner> {
  switch (inputs.method) {
    case 'docker':
      return dockerRunner(inputs);
    case 'install':
      await installTrivy(inputs);
      return task.tool('trivy');
    case 'system':
      console.log('Run requested using system Trivy binary...');
      return task.tool('trivy');
    default:
      throw new Error(`Unknown run method: ${inputs.method}`);
  }
}

async function dockerRunner(inputs: TaskInputs): Promise<ToolRunner> {
  console.log('Run requested using docker...');
  validateDockerOnNonLinux();
  const runner = task.tool('docker');
  const cwd = process.cwd();
  const dockerConfig = task.getVariable('DOCKER_CONFIG');

  runner.line('run --rm');
  setDockerNonRootUser(runner);
  runner.line('-v /var/run/docker.sock:/var/run/docker.sock');
  runner.argIf(dockerConfig, ['-v', `${dockerConfig}:${dockerConfig}`]);
  runner.line(`-v ${tmpPath}:${tmpPath}`);
  runner.line(`-v ${cwd}:${cwd}`);
  runner.line(`--workdir ${cwd}`);
  runner.line(`-e TRIVY_CACHE_DIR=${tmpPath}`);
  runner.argIf(dockerConfig, ['-e', `DOCKER_CONFIG=${dockerConfig}`]);

  const trivyImage =
    inputs.image === ''
      ? `aquasec/trivy:${stripV(inputs.version)}`
      : inputs.image;

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
