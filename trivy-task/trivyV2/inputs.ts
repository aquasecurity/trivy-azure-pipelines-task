import task = require('azure-pipelines-task-lib/task');

export type TaskInputs = {
  method: string;
  image: string;
  version: string;
  options: string[];
  scanType: string;
  target: string;
  scanners: string;
  severities: string;
  reports: string[];
  templates?: string;
  publish: boolean;
  ignoreUnfixed: boolean;
  ignoreScanErrors: boolean;
  hasAquaAccount: boolean;
  aquaKey?: string;
  aquaSecret?: string;
  aquaUrl?: string;
  authUrl?: string;
};

/**
 * Returns task's inputs.
 */
export function getTaskInputs(): TaskInputs {
  const aquaPlatform = task.getInput('aquaPlatform', false) ?? '';
  return {
    method: task.getInput('method', false) ?? 'install',
    image: task.getInput('image', false) ?? '',
    version: task.getInput('version', false) ?? 'latest',
    options: task.getDelimitedInput('options', ' '),
    scanType: task.getInputRequired('type'),
    target: task.getInputRequired('target'),
    scanners: task
      .getDelimitedInput('scanners', ',')
      .map((s) => s.trim())
      .join(','),
    severities: task
      .getDelimitedInput('severities', ',')
      .map((s) => s.trim())
      .join(','),
    ignoreUnfixed: task.getBoolInput('ignoreUnfixed', false),
    ignoreScanErrors: task.getBoolInput('ignoreScanErrors', false),
    reports: task.getDelimitedInput('reports', ',').map((s) => s.trim()),
    publish: task.getBoolInput('publish', false),
    templates: task.getInput('templates', false),
    hasAquaAccount: !!aquaPlatform,
    aquaKey: task.getEndpointAuthorizationParameter(
      aquaPlatform,
      'aquaKey',
      true
    ),
    aquaSecret: task.getEndpointAuthorizationParameter(
      aquaPlatform,
      'aquaSecret',
      true
    ),
    aquaUrl: task.getEndpointUrl(aquaPlatform, true),
    authUrl: task.getEndpointAuthorizationParameter(
      aquaPlatform,
      'authUrl',
      true
    ),
  };
}
