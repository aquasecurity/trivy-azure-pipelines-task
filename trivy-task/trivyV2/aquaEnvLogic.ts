export type AquaEnvInputs = {
  aquaRegion?: string;
  authUrl?: string;
  aquaUrl?: string;
};

export type AquaEnvSnapshot = {
  AQUA_REGION?: string;
  TRIVY_SERVER_URL?: string;
};

const CSPM_URL_TO_TRIVY_SERVER: Record<string, string> = {
  'https://stage.api.cloudsploit.com':
    'https://us-east-1.staging.edge.cloud.aquasec.com/',
  'https://api.cloudsploit.com': 'https://us-east-1.edge.cloud.aquasec.com/',
  'https://eu-1.api.cloudsploit.com':
    'https://eu-central-1.edge.cloud.aquasec.com/',
  'https://asia-1.api.cloudsploit.com':
    'https://ap-southeast-1.edge.cloud.aquasec.com/',
  'https://ap-2.api.cloudsploit.com':
    'https://ap-southeast-2.edge.cloud.aquasec.com/',
};

const AQUA_URL_TO_REGION: Record<string, string> = {
  'https://cloud.aquasec.com': 'us',
  'https://api.supply-chain.cloud.aquasec.com': 'us',
  'https://api.eu-1.supply-chain.cloud.aquasec.com': 'eu',
  'https://api.asia-1.supply-chain.cloud.aquasec.com': 'singapore',
  'https://api.ap-2.supply-chain.cloud.aquasec.com': 'australia',
  'https://api.dev.supply-chain.cloud.aquasec.com': 'dev',
};

const VALID_AQUA_REGIONS = new Set([
  'us',
  'eu',
  'singapore',
  'australia',
  'dev',
]);

export function getBaseUrl(inputUrl: string | undefined): string | undefined {
  if (!inputUrl) {
    return undefined;
  }

  try {
    return new URL(inputUrl).origin;
  } catch {
    return undefined;
  }
}

export function resolveAquaPlatformEnv(
  inputs: AquaEnvInputs,
  existing: AquaEnvSnapshot = {}
): AquaEnvSnapshot {
  if (existing.TRIVY_SERVER_URL) {
    return {};
  }

  if (existing.AQUA_REGION) {
    return {};
  }

  const explicitRegion = inputs.aquaRegion?.trim().toLowerCase();
  if (explicitRegion) {
    if (!VALID_AQUA_REGIONS.has(explicitRegion)) {
      throw new Error(
        `Invalid Aqua Platform region '${inputs.aquaRegion}'. Valid values: us, eu, singapore, australia, dev`
      );
    }
    return { AQUA_REGION: explicitRegion };
  }

  const cspmBase = getBaseUrl(inputs.authUrl);
  if (cspmBase && CSPM_URL_TO_TRIVY_SERVER[cspmBase]) {
    return { TRIVY_SERVER_URL: CSPM_URL_TO_TRIVY_SERVER[cspmBase] };
  }

  const aquaBase = getBaseUrl(inputs.aquaUrl);
  if (aquaBase && AQUA_URL_TO_REGION[aquaBase]) {
    return { AQUA_REGION: AQUA_URL_TO_REGION[aquaBase] };
  }

  return {};
}
