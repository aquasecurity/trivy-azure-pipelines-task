import path from 'path';
import task = require('azure-pipelines-task-lib/task');
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { randomUUID } from 'crypto';
import { createRunner, tmpPath } from './trivyLoader';
import { generateAdditionalReports } from './additionalReporting';
import { getTaskInputs, hasAquaAccount, TaskInputs } from './utils';

async function run() {
  task.debug('Starting Trivy task...');
  const inputs = getTaskInputs();
  const randomPrefix = randomUUID();
  const resultsFileName = `trivy-results-${randomPrefix}.json`;
  const resultsFilePath = path.join(tmpPath, resultsFileName);
  task.rmRF(resultsFilePath);

  const hasAccount = hasAquaAccount(inputs);
  const assuranceFileName = `assurance-${randomPrefix}.json`;
  const assuranceFilePath = path.join(tmpPath, assuranceFileName);

  // copy the process env and add the aqua credentials
  const env = { ...process.env };

  if (hasAccount) {
    task.rmRF(assuranceFilePath);
    // const credentials = getAquaAccount();
    env.AQUA_KEY = inputs.aquaKey;
    env.AQUA_SECRET = inputs.aquaSecret;
    env.TRIVY_RUN_AS_PLUGIN = 'aqua';
    env.OVERRIDE_REPOSITORY = task.getVariable('Build.Repository.Name');
    env.OVERRIDE_BRANCH = task.getVariable('Build.SourceBranchName');
    env.AQUA_ASSURANCE_EXPORT = assuranceFilePath;
    if (inputs.devMode) {
      env.AQUA_URL = 'https://api.dev.supply-chain.cloud.aquasec.com';
      env.CSPM_URL = 'https://stage.api.cloudsploit.com';
    }
  }

  const runner = await createRunner(inputs);
  runner.argIf(inputs.debug, '--debug');

  configureScan(runner, inputs, resultsFilePath);

  task.debug('Running Trivy...');
  const result = runner.execSync({ env });
  if (result.code === 0) {
    task.setResult(task.TaskResult.Succeeded, 'No problems found.');
  } else {
    task.setResult(task.TaskResult.Failed, 'Failed: Trivy detected problems.');
  }

  if (hasAccount) {
    console.log('Publishing JSON assurance results...');
    if (task.exist(assuranceFilePath)) {
      task.addAttachment(
        'ASSURANCE_RESULT',
        assuranceFileName,
        assuranceFilePath
      );
    }
  }

  task.debug('Publishing JSON results...');
  if (task.exist(resultsFilePath)) {
    task.addAttachment('JSON_RESULT', resultsFileName, resultsFilePath);

    task.debug('Generating additional reports...');
    await generateAdditionalReports(inputs, resultsFilePath);
  } else {
    task.error(
      'Trivy seems to have failed so no output path to generate reports from.'
    );
  }
  console.log('Done!');
}

function configureScan(runner: ToolRunner, inputs: TaskInputs, output: string) {
  console.log('Configuring options for image scan...');
  const scanType = inputs.type !== undefined && inputs.type !== '' ? inputs.type : inputs.image ? 'image' : 'fs';
  const scanTarget = inputs.image ? inputs.image : inputs.scanPath;

  runner.arg([scanType]);
  runner.arg(['--exit-code', inputs.exitCode]);
  runner.arg(['--format', 'json']);
  runner.arg(['--output', output]);
  runner.argIf(inputs.severities, ['--severity', inputs.severities]);
  runner.argIf(inputs.ignoreUnfixed, ['--ignore-unfixed']);

  // if scanners haven't been set in the options, add them here
  if (
    !inputs.options.includes('--scanners') &&
    !inputs.options.includes('--security-checks') &&
    inputs.scanners
  ) {
    runner.arg(['--scanners', inputs.scanners]);
  }

  if (inputs.options) {
    runner.line(inputs.options);
  }

  runner.arg(scanTarget);
}

run().catch((err: Error) => {
  task.setResult(task.TaskResult.Failed, err.message);
});
