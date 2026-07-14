const assert = require('assert');
const { finalizeScanWithHandlers } = require('../dist/taskFlowStandalone');

async function run() {
  const calls = [];

  await finalizeScanWithHandlers(2, {}, '/tmp/trivy-results.json', {
    generateReports: async () => {
      calls.push('generateReports');
    },
    checkScanResult: () => {
      calls.push('checkScanResult');
    },
  });

  assert.deepStrictEqual(calls, ['generateReports', 'checkScanResult']);
  console.log('ok finalizeScan publishes reports before evaluating scan result');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
