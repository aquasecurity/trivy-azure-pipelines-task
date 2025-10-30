import task = require('azure-pipelines-task-lib/task');

export type TaskInputs = {
  docker?: boolean;
  loginDockerConfig?: boolean;
  trivyImage: string;
  useSystem?: boolean;
  version: string;
  exitCode: string;
  debug?: boolean;
  devMode?: boolean;
  type?: string;
  image?: string;
  scanPath?: string;
  scanners: string;
  severities: string;
  ignoreUnfixed?: boolean;
  aquaKey?: string;
  aquaSecret?: string;
  cosignOutput?: boolean;
  cyclonedxOutput?: boolean;
  jsonOutput?: boolean;
  sarifOutput?: boolean;
  spdxOutput?: boolean;
  spdxjsonOutput?: boolean;
  tableOutput?: boolean;
  options: string;
  trivyUrl?: string;
  customCaCertPath?: string;
  skipDownloadCertificateChecking: boolean;
};

/**
 * Returns task's inputs.
 */
export function getTaskInputs(): TaskInputs {
  const inputs = {
    docker: task.getBoolInput('docker', false),
    loginDockerConfig: task.getBoolInput('loginDockerConfig', false),
    trivyImage: task.getInput('trivyImage', false) ?? 'aquasec/trivy',
    useSystem: task.getBoolInput('useSystemInstallation', false),
    version: task.getInput('version', false) ?? 'latest',
    exitCode: task.getInput('exitCode', false) ?? '1',
    debug: task.getBoolInput('debug', false),
    devMode: task.getBoolInput('devMode', false),
    type: task.getInput('type', false) ?? '',
    image: task.getInput('image', false),
    scanPath: task.getInput('path', false),
    scanners: task.getInput('scanners', false) ?? '',
    severities: task.getInput('severities', false) ?? '',
    ignoreUnfixed: task.getBoolInput('ignoreUnfixed', false),
    aquaKey: task.getInput('aquaKey', false),
    aquaSecret: task.getInput('aquaSecret', false),
    cosignOutput: task.getBoolInput('cosignOutput', false),
    cyclonedxOutput: task.getBoolInput('cyclonedxOutput', false),
    jsonOutput: task.getBoolInput('jsonOutput', false),
    sarifOutput: task.getBoolInput('sarifOutput', false),
    spdxOutput: task.getBoolInput('spdxOutput', false),
    spdxjsonOutput: task.getBoolInput('spdxjsonOutput', false),
    tableOutput: task.getBoolInput('tableOutput', false),
    options: task.getInput('options', false) ?? '',
    trivyUrl: task.getInput('trivyUrl', false) ?? '',
    customCaCertPath: task.getPathInput('customCaCertPath', false),
    skipDownloadCertificateChecking: task.getBoolInput(
      'skipDownloadCertificateChecking',
      false
    ),
  };
  validateInputs(inputs);
  return inputs;
}

/**
 * Validates the task inputs.
 * @param inputs - The task inputs to validate.
 * @throws Will throw an error if inputs are invalid.
 */
function validateInputs(inputs: TaskInputs): void {
  // validate scanners input
  const validScanners = ['vuln', 'misconfig', 'secret', 'license'];
  if (inputs.scanners) {
    inputs.scanners.split(',').forEach((scanner) => {
      if (!validScanners.includes(scanner.trim())) {
        throw new Error(
          `Invalid scanner value '${scanner}' in 'scanners'. Valid values are: ${validScanners.join(',')}`
        );
      }
    });
  }

  if (inputs.aquaKey && inputs.image) {
    throw new Error('Aqua Platform is not supported for image scans.');
  }

  if (inputs.aquaKey && inputs.docker) {
    throw new Error(
      'Aqua Platform is not supported when running in Docker mode.'
    );
  }

  // validate image and path inputs
  if (!inputs.image && !inputs.scanPath) {
    throw new Error(
      "You must specify something to scan. Use either the 'image' or 'path' option."
    );
  }
  if (inputs.scanPath && inputs.image) {
    throw new Error(
      "You must specify only one of the 'image' or 'path' options. Use multiple task definitions if you want to scan multiple targets."
    );
  }

  if (inputs.loginDockerConfig && inputs.docker) {
    const dockerConfig = task.getVariable('DOCKER_CONFIG');
    if (!dockerConfig || dockerConfig.length === 0) {
      task.warning(
        "'loginDockerConfig' is set to true, but 'DOCKER_CONFIG' is not set or empty. " +
          'This may cause issues with Docker login. Please check your pipeline configuration.'
      );
    }
  }
}

/**
 * Checks if the task has an Aqua account.
 * @param inputs - The task inputs to check.
 * @returns True if the task has an Aqua credentials, false otherwise.
 */
export function hasAquaAccount(inputs: TaskInputs): boolean {
  return inputs.aquaKey !== undefined && inputs.aquaSecret !== undefined;
}

/**
 * Strips the 'v' prefix from a version string.
 * @param version - The version string to strip.
 * @returns The version string without the 'v' prefix.
 */
export function stripV(version: string): string {
  if (version.startsWith('v')) {
    version = version.substring(1);
  }
  return version;
}
