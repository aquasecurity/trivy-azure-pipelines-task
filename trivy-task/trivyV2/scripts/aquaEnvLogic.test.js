const assert = require('assert');
const { getBaseUrl, resolveAquaPlatformEnv } = require('../dist/aquaEnvLogic');

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('getBaseUrl normalizes trailing slashes', () => {
  assert.strictEqual(getBaseUrl('https://cloud.aquasec.com/'), 'https://cloud.aquasec.com');
});

test('resolveAquaPlatformEnv preserves pipeline TRIVY_SERVER_URL', () => {
  assert.deepStrictEqual(
    resolveAquaPlatformEnv(
      { authUrl: 'https://api.cloudsploit.com', aquaUrl: 'https://cloud.aquasec.com/' },
      { TRIVY_SERVER_URL: 'https://custom.example/' }
    ),
    {}
  );
});

test('resolveAquaPlatformEnv preserves pipeline AQUA_REGION', () => {
  assert.deepStrictEqual(resolveAquaPlatformEnv({ aquaRegion: 'eu' }, { AQUA_REGION: 'us' }), {});
});

test('resolveAquaPlatformEnv uses explicit aquaRegion input', () => {
  assert.deepStrictEqual(resolveAquaPlatformEnv({ aquaRegion: 'eu' }), {
    AQUA_REGION: 'eu',
  });
});

test('resolveAquaPlatformEnv maps known CSPM URL to TRIVY_SERVER_URL', () => {
  assert.deepStrictEqual(resolveAquaPlatformEnv({ authUrl: 'https://api.cloudsploit.com/v1/token' }), {
    TRIVY_SERVER_URL: 'https://us-east-1.edge.cloud.aquasec.com/',
  });
});

test('resolveAquaPlatformEnv maps Aqua console URL to AQUA_REGION for custom CSPM', () => {
  assert.deepStrictEqual(
    resolveAquaPlatformEnv({
      authUrl: 'https://custom-cspm.example.com',
      aquaUrl: 'https://cloud.aquasec.com/',
    }),
    { AQUA_REGION: 'us' }
  );
});

test('resolveAquaPlatformEnv rejects invalid aquaRegion input', () => {
  assert.throws(() => resolveAquaPlatformEnv({ aquaRegion: 'invalid' }), /Invalid Aqua Platform region/);
});
