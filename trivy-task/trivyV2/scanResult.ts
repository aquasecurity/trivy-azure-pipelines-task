import task = require('azure-pipelines-task-lib/task');
import { TaskInputs } from './inputs';
import { getHighestSeverityLevel } from './utils';
import { highestSeverityBreached as isHighestSeverityBreached } from './scanResultLogic';

export function highestSeverityBreached(
  inputs: TaskInputs,
  resultsFilePath: string
): boolean {
  task.debug(`Fail on severity threshold: ${inputs.failOnSeverityThreshold}`);
  const highestFoundSeverity = getHighestSeverityLevel(resultsFilePath);
  task.debug(`Highest severity found: ${highestFoundSeverity}`);
  return isHighestSeverityBreached(inputs, highestFoundSeverity);
}

export function checkScanResult(
  exitCode: number,
  inputs: TaskInputs,
  resultsFilePath: string
) {
  task.debug(`Trivy scan completed with exit code: ${exitCode}`);

  if (exitCode === 0) {
    task.setResult(task.TaskResult.Succeeded, 'No issues found.');
    return;
  }

  const isHighestSeverityBreachedResult = highestSeverityBreached(
    inputs,
    resultsFilePath
  );

  task.debug(`Highest severity breached: ${isHighestSeverityBreachedResult}`);
  if (exitCode === 2 && inputs.ignoreScanErrors) {
    if (isHighestSeverityBreachedResult) {
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
    if (isHighestSeverityBreachedResult) {
      task.setResult(task.TaskResult.Failed, 'Issues found.');
    } else {
      task.setResult(task.TaskResult.Succeeded, 'No issues found.');
    }
    return;
  } else {
    task.setResult(task.TaskResult.Failed, 'Trivy runner error.', true);
    return;
  }
}
