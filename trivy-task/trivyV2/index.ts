import path from 'path';
import task = require('azure-pipelines-task-lib/task');
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { randomUUID } from 'crypto';
import { createRunner, tmpPath } from './runner';
import { getTaskInputs } from './inputs';
import { finalizeScan, publishAssuranceResults } from './taskFlow';

const randomPrefix = randomUUID();
const resultsFileName = `trivy-results-${randomPrefix}.json`;
const assuranceFileName = `trivy-assurance-${randomPrefix}.json`;
const resultsFilePath = path.join(tmpPath, resultsFileName);
const assuranceFilePath = path.join(tmpPath, assuranceFileName);

async function run() {
  console.log('##[section]Starting Trivy task...');
  const inputs = getTaskInputs();
  task.debug(`Task inputs: ${JSON.stringify(inputs)}`);

  task.mkdirP(tmpPath);

  const env = { ...process.env };

  if (inputs.hasAquaAccount) {
    if (inputs.scanType === 'image') {
      throw new Error(
        'Aqua platform is not supported for image scan. Please use the filesystem scan.'
      );
    }

    if (inputs.method === 'docker') {
      throw new Error(
        'Aqua platform is not supported for docker run. Please use the install method.'
      );
    }

    task.rmRF(assuranceFilePath);
    task.debug('Configuring Aqua environment variables...');
    env.AQUA_ASSURANCE_EXPORT = assuranceFilePath;
    env.AQUA_KEY = inputs.aquaKey;
    env.AQUA_SECRET = inputs.aquaSecret;
    env.AQUA_URL = inputs.aquaUrl;
    env.CSPM_URL = inputs.authUrl;
    env.OVERRIDE_BRANCH = task.getVariable('Build.SourceBranchName');
    env.OVERRIDE_REPOSITORY = task.getVariable('Build.Repository.Name');
    env.TRIVY_RUN_AS_PLUGIN = 'aqua';
  }

  const runner = await createRunner(inputs);
  configureScan(runner, inputs);

  task.debug('Running Trivy...');

  const result = runner.execSync({ env });

  await publishAssuranceResults(inputs, assuranceFilePath, assuranceFileName);
  await finalizeScan(result.code, inputs, resultsFilePath);
}

function configureScan(
  runner: ToolRunner,
  inputs: ReturnType<typeof getTaskInputs>
) {
  task.rmRF(resultsFilePath);
  console.log('Configuring options for image scan...');
  runner.arg(inputs.scanType);
  runner.arg(['--exit-code', '2']);
  runner.arg(['--format', 'json']);
  runner.argIf(inputs.scanners, ['--scanners', inputs.scanners]);
  runner.arg('--list-all-pkgs');
  runner.argIf(inputs.severities, ['--severity', inputs.severities]);
  runner.argIf(inputs.ignoreUnfixed, ['--ignore-unfixed']);
  runner.argIf(inputs.showSuppressed, ['--show-suppressed']);
  runner.arg(['--output', resultsFilePath]);
  runner.arg(inputs.options);
  runner.arg(inputs.target);
}

run().catch((err: Error) => {
  task.setResult(task.TaskResult.Failed, err.message);
});
