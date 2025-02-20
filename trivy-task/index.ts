import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import task = require('azure-pipelines-task-lib/task');

import { createRunner, tmpPath } from './trivyLoader';
import { getAquaAccount, hasAquaAccount } from './utils';
import { generateAdditionalReports } from './additionalReporting';

async function run() {
  task.debug('Starting Trivy task...');
  const isDocker = task.getBoolInput('docker', false);
  const resultsFile = `trivy-results-${Math.random()}.json`;
  const localOutputPath = `${tmpPath}${resultsFile}`;
  const outputPath = isDocker ? `/tmp/${resultsFile}` : localOutputPath;
  task.rmRF(localOutputPath);

  const scanPath = task.getInput('path', false);
  const image = task.getInput('image', false);
  const scanners = task.getInput('scanners', false) ?? '';
  const ignoreUnfixed = task.getBoolInput('ignoreUnfixed', false);
  const severities = task.getInput('severities', false) ?? '';
  const options = task.getInput('options', false) ?? '';

  // check scanners only has valid values
  const validScanners = ['vuln', 'misconfig', 'secret', 'license'];
  const scannerList = scanners.split(',');
  scannerList.forEach((scanner) => {
    if (!validScanners.includes(scanner.trim())) {
      throw new Error(
        `Invalid scanner value '${scanner}' in 'scanners'. Valid values are: ${validScanners.join(
          ', '
        )}`
      );
    }
  });

  if (scanPath === undefined && image === undefined) {
    throw new Error(
      "You must specify something to scan. Use either the 'image' or 'path' option."
    );
  }
  if (scanPath !== undefined && image !== undefined) {
    throw new Error(
      "You must specify only one of the 'image' or 'path' options. Use multiple task definitions if you want to scan multiple targets."
    );
  }

  const hasAccount = hasAquaAccount();
  const assuranceResultsFile = `trivy-assurance-${Math.random()}.json`;
  const localAssurancePath = `${tmpPath}${assuranceResultsFile}`;
  const assurancePath = isDocker
    ? `/tmp/{assuranceResultsFile}`
    : localAssurancePath;

  // copy the process env and add the aqua credentials
  const env = { ...process.env };

  if (hasAccount) {
    task.rmRF(assurancePath);
    const credentials = getAquaAccount();
    env.AQUA_KEY = credentials.key;
    env.AQUA_SECRET = credentials.secret;
    env.TRIVY_RUN_AS_PLUGIN = 'aqua';
    env.OVERRIDE_REPOSITORY = task.getVariable('Build.Repository.Name');
    env.OVERRIDE_BRANCH = task.getVariable('Build.SourceBranchName');
    env.AQUA_ASSURANCE_EXPORT = assurancePath;
    if (task.getBoolInput('devMode', false)) {
      env.AQUA_URL = 'https://api.dev.supply-chain.cloud.aquasec.com';
      env.CSPM_URL = 'https://stage.api.cloudsploit.com';
    }
  }

  const runner = await createRunner();

  if (task.getBoolInput('debug', false)) {
    runner.arg('--debug');
  }

  if (scanPath !== undefined) {
    configureScan(
      runner,
      'fs',
      scanPath,
      outputPath,
      severities,
      scanners,
      ignoreUnfixed,
      options
    );
  } else if (image !== undefined) {
    configureScan(
      runner,
      'image',
      image,
      outputPath,
      severities,
      scanners,
      ignoreUnfixed,
      options
    );
  }

  task.debug('Running Trivy...');
  const result = runner.execSync({ env });
  if (result.code === 0) {
    task.setResult(task.TaskResult.Succeeded, 'No problems found.');
  } else {
    task.setResult(task.TaskResult.Failed, 'Failed: Trivy detected problems.');
  }

  if (hasAccount) {
    console.log('Publishing JSON assurance results...');
    if (task.exist(localAssurancePath)) {
      task.addAttachment(
        'ASSURANCE_RESULT',
        assuranceResultsFile,
        localAssurancePath
      );
    }
  }

  task.debug('Publishing JSON results...');
  if (task.exist(localOutputPath)) {
    task.addAttachment('JSON_RESULT', resultsFile, localOutputPath);
  }

  task.debug('Generating additional reports...');
  if (task.exist(localOutputPath)) {
    generateAdditionalReports(localOutputPath, outputPath, isDocker);
  } else {
    task.error(
      'Trivy seems to have failed so no output path to generate reports from.'
    );
  }
  console.log('Done!');
}

function configureScan(
  runner: ToolRunner,
  type: string,
  target: string,
  outputPath: string,
  severities: string,
  scanners: string,
  ignoreUnfixed: boolean,
  options: string
) {
  console.log('Configuring options for image scan...');
  let exitCode = task.getInput('exitCode', false);
  if (exitCode === undefined) {
    exitCode = '1';
  }
  runner.arg([type]);
  runner.arg(['--exit-code', exitCode]);
  runner.arg(['--format', 'json']);
  runner.arg(['--output', outputPath]);
  if (severities.length) {
    runner.arg(['--severity', severities]);
  }
  if (ignoreUnfixed) {
    runner.arg(['--ignore-unfixed']);
  }
  if (options.length) {
    runner.arg(options.split(' '));
  }

  // if scanners haven't been set in the options, add them here
  if (
    !options.includes('--scanners') &&
    !options.includes('--security-checks')
  ) {
    runner.arg(['--scanners', scanners]);
  }

  runner.arg(target);
}

run().catch((err: Error) => {
  task.setResult(task.TaskResult.Failed, err.message);
});
