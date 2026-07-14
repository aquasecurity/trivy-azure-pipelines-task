type FinalizeScanHandlers = {
  generateReports: (
    inputs: Record<string, unknown>,
    resultsFilePath: string
  ) => Promise<void>;
  checkScanResult: (
    exitCode: number,
    inputs: Record<string, unknown>,
    resultsFilePath: string
  ) => void;
};

export async function finalizeScanWithHandlers(
  exitCode: number,
  inputs: Record<string, unknown>,
  resultsFilePath: string,
  handlers: FinalizeScanHandlers
) {
  await handlers.generateReports(inputs, resultsFilePath);
  handlers.checkScanResult(exitCode, inputs, resultsFilePath);
}
