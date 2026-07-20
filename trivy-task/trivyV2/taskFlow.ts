import { TaskInputs } from './inputs';

type FinalizeScanHandlers = {
  generateReports: (
    inputs: TaskInputs,
    resultsFilePath: string
  ) => Promise<void>;
  checkScanResult: (
    exitCode: number,
    inputs: TaskInputs,
    resultsFilePath: string
  ) => void;
};

export async function finalizeScanWithHandlers(
  exitCode: number,
  inputs: TaskInputs,
  resultsFilePath: string,
  handlers: FinalizeScanHandlers
) {
  await handlers.generateReports(inputs, resultsFilePath);
  handlers.checkScanResult(exitCode, inputs, resultsFilePath);
}

export async function finalizeScan(
  exitCode: number,
  inputs: TaskInputs,
  resultsFilePath: string
) {
  const { generateReports } = await import('./reports');
  const { checkScanResult } = await import('./scanResult');

  await finalizeScanWithHandlers(exitCode, inputs, resultsFilePath, {
    generateReports,
    checkScanResult,
  });
}

export async function publishAssuranceResults(
  inputs: TaskInputs,
  assuranceFilePath: string,
  assuranceFileName: string
) {
  const task = (await import('azure-pipelines-task-lib/task')).default;

  if (inputs.hasAquaAccount && task.exist(assuranceFilePath)) {
    console.log('Publishing JSON assurance results...');
    task.addAttachment(
      'ASSURANCE_RESULT',
      assuranceFileName,
      assuranceFilePath
    );
  }
}
