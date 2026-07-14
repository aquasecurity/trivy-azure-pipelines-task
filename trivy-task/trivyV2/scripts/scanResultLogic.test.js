const assert = require('assert');
const {
  highestSeverityBreached,
  resolveScanResult,
} = require('../dist/scanResultLogic');

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('highestSeverityBreached fails when threshold is UNKNOWN and vulns exist', () => {
  assert.strictEqual(
    highestSeverityBreached(
      { failOnSeverityThreshold: 'UNKNOWN', ignoreScanErrors: false },
      'HIGH'
    ),
    true
  );
});

test('resolveScanResult marks vulnerability scans as failed before ignoring threshold', () => {
  assert.strictEqual(
    resolveScanResult(
      { exitCode: 2, highestSeverity: 'HIGH' },
      { failOnSeverityThreshold: 'UNKNOWN', ignoreScanErrors: false }
    ),
    'Failed'
  );
});

test('resolveScanResult succeeds when threshold is not breached', () => {
  assert.strictEqual(
    resolveScanResult(
      { exitCode: 2, highestSeverity: 'LOW' },
      { failOnSeverityThreshold: 'CRITICAL', ignoreScanErrors: false }
    ),
    'Succeeded'
  );
});
