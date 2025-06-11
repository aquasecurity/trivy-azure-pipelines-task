import path from 'path';
import task = require('azure-pipelines-task-lib/task');
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import { randomUUID } from 'crypto';
import { createRunner, tmpPath } from './runner';
import { generateReports } from './reports';
import { getTaskInputs, TaskInputs } from './inputs';
import { getHighestSeverityLevel, severityLevels } from './utils';

const randomPrefix = randomUUID();
const resultsFileName = `trivy-results-${randomPrefix}.json`;
const assuranceFileName = `trivy-assurance-${randomPrefix}.json`;
const resultsFilePath = path.join(tmpPath, resultsFileName);
const assuranceFilePath = path.join(tmpPath, assuranceFileName);

async function run() {
  console.log('##[section]Starting Trivy task...');
  // get the task inputs
  const inputs = getTaskInputs();
  task.debug(`Task inputs: ${JSON.stringify(inputs)}`);

  // ensure the temp dir is created for the task
  task.mkdirP(tmpPath);

  // copy the process env
  const env = { ...process.env };

  // configure the environment variables for Aqua Plugin
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

  // create the runner and configure the scan
  const runner = await createRunner(inputs);
  configureScan(runner, inputs);

  task.debug('Running Trivy...');

  const result = runner.execSync({ env });

  checkScanResult(result.code, inputs);

  if (inputs.hasAquaAccount && task.exist(assuranceFilePath)) {
    console.log('Publishing JSON assurance results...');
    task.addAttachment(
      'ASSURANCE_RESULT',
      assuranceFileName,
      assuranceFilePath
    );
  }

  await generateReports(inputs, resultsFilePath);
}

function configureScan(runner: ToolRunner, inputs: TaskInputs) {
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

function highestSeverityBreached(
  inputs: TaskInputs,
  resultsFilePath: string
): boolean {
  task.debug(`Fail on severity threshold: ${inputs.failOnSeverityThreshold}`);

  const severityThreshold = inputs.failOnSeverityThreshold.toUpperCase();
  const highestFoundSeverity = getHighestSeverityLevel(resultsFilePath);

  const severityThresholdIndex = severityLevels.indexOf(severityThreshold);
  const highestIndex = severityLevels.indexOf(highestFoundSeverity);

  task.debug(
    `Highest severity found: ${highestFoundSeverity} (index: ${highestIndex})`
  );
  task.debug(
    `Severity threshold: ${severityThreshold} (index: ${severityThresholdIndex})`
  );

  return (
    severityThresholdIndex >= 0 &&
    highestIndex >= 0 &&
    highestIndex >= severityThresholdIndex
  );
}

function checkScanResult(exitCode: number, inputs: TaskInputs) {
  task.debug(`Trivy scan completed with exit code: ${exitCode}`);

  if (exitCode === 0) {
    task.setResult(task.TaskResult.Succeeded, 'No issues found.');
    return;
  }

  const isHighestSeverityBreached = highestSeverityBreached(
    inputs,
    resultsFilePath
  );

  task.debug(`Highest severity breached: ${isHighestSeverityBreached}`);
  if (exitCode === 2 && inputs.ignoreScanErrors) {
    if (isHighestSeverityBreached) {
      task.setResult(task.TaskResult.SucceededWithIssues, 'Issues found.');
      return;
    } else {
      task.setResult(
        task.TaskResult.Succeeded,
        'Issues found but ignoring scan errors as per configuration.'
      );
      return;
    }
  } else if (exitCode === 2 && !inputs.ignoreScanErrors) {
    if (isHighestSeverityBreached) {
      task.setResult(task.TaskResult.Failed, 'Issues found.');
    } else {
      task.setResult(
        task.TaskResult.Succeeded,
        'Issues found but ignoring scan errors as per configuration.'
      );
    }
    return;
  } else {
    task.setResult(task.TaskResult.Failed, 'Trivy runner error.', true);
    return;
  }
}

run().catch((err: Error) => {
  task.setResult(task.TaskResult.Failed, err.message);
});
