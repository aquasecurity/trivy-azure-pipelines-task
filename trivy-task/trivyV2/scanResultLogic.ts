type TaskInputs = {
  failOnSeverityThreshold: string;
  ignoreScanErrors: boolean;
};

type SeverityScanResult = {
  exitCode: number;
  highestSeverity: string;
};

const severityLevels = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function highestSeverityBreached(
  inputs: TaskInputs,
  highestSeverity: string
): boolean {
  const severityThreshold = inputs.failOnSeverityThreshold.toUpperCase();
  const severityThresholdIndex = severityLevels.indexOf(severityThreshold);
  const highestIndex = severityLevels.indexOf(highestSeverity);

  return (
    severityThresholdIndex >= 0 &&
    highestIndex >= 0 &&
    highestIndex >= severityThresholdIndex
  );
}

export function resolveScanResult(
  scanResult: SeverityScanResult,
  inputs: TaskInputs
): 'Succeeded' | 'SucceededWithIssues' | 'Failed' {
  if (scanResult.exitCode === 0) {
    return 'Succeeded';
  }

  const isHighestSeverityBreached = highestSeverityBreached(
    inputs,
    scanResult.highestSeverity
  );

  if (scanResult.exitCode === 2 && inputs.ignoreScanErrors) {
    return isHighestSeverityBreached ? 'SucceededWithIssues' : 'Succeeded';
  }

  if (scanResult.exitCode === 2 && !inputs.ignoreScanErrors) {
    return isHighestSeverityBreached ? 'Failed' : 'Succeeded';
  }

  return 'Failed';
}
