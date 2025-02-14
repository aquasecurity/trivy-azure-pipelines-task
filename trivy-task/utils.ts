import task = require('azure-pipelines-task-lib/task');

export function stripV(version: string): string {
  if (version.length > 0 && version[0] === 'v') {
    version = version?.substring(1);
  }
  return version;
}

export function hasAquaAccount(): boolean {
  const credentials = getAquaAccount();
  return credentials.key !== undefined && credentials.secret !== undefined;
}

export interface aquaCredentials {
  key: string | undefined;
  secret: string | undefined;
}

export function getAquaAccount(): aquaCredentials {
  const key = task.getInput('aquaKey', false);
  const secret = task.getInput('aquaSecret', false);
  return {
    key: key,
    secret: secret,
  };
}

export function isDevMode(): boolean {
  return task.getBoolInput('devMode', false);
}

export function randomSuffix(length: number): string {
  const characters = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
}
