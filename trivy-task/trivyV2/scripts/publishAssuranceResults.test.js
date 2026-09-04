const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

function loadPublishAssuranceResults(mockTask) {
  const taskFlowPath = path.resolve(__dirname, '../dist/taskFlow.js');
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function (id) {
    if (id === 'azure-pipelines-task-lib/task') {
      return mockTask;
    }
    return originalRequire.apply(this, arguments);
  };

  delete require.cache[taskFlowPath];
  const { publishAssuranceResults } = require('../dist/taskFlow');

  Module.prototype.require = originalRequire;
  return publishAssuranceResults;
}

async function run() {
  const taskFlowJs = fs.readFileSync(path.resolve(__dirname, '../dist/taskFlow.js'), 'utf8');
  assert.ok(
    !taskFlowJs.includes("__importStar(require('azure-pipelines-task-lib/task'))).default"),
    'compiled taskFlow must not read task-lib through .default'
  );
  assert.match(
    taskFlowJs,
    /require\(["']azure-pipelines-task-lib\/task["']\)/,
    'compiled taskFlow must statically require task-lib'
  );

  const calls = { exist: [], addAttachment: [] };
  const mockTask = {
    exist: (filePath) => {
      calls.exist.push(filePath);
      return true;
    },
    addAttachment: (...args) => {
      calls.addAttachment.push(args);
    },
  };

  const publishAssuranceResults = loadPublishAssuranceResults(mockTask);

  await publishAssuranceResults({ hasAquaAccount: true }, '/tmp/trivy-assurance.json', 'trivy-assurance.json');

  assert.deepStrictEqual(calls.exist, ['/tmp/trivy-assurance.json']);
  assert.deepStrictEqual(calls.addAttachment, [
    ['ASSURANCE_RESULT', 'trivy-assurance.json', '/tmp/trivy-assurance.json'],
  ]);

  calls.exist.length = 0;
  calls.addAttachment.length = 0;

  await publishAssuranceResults({ hasAquaAccount: false }, '/tmp/trivy-assurance.json', 'trivy-assurance.json');

  assert.deepStrictEqual(calls.exist, []);
  assert.deepStrictEqual(calls.addAttachment, []);

  calls.exist.length = 0;
  calls.addAttachment.length = 0;

  const publishWhenMissing = loadPublishAssuranceResults({
    exist: () => false,
    addAttachment: (...args) => {
      calls.addAttachment.push(args);
    },
  });

  await publishWhenMissing({ hasAquaAccount: true }, '/tmp/missing-assurance.json', 'missing-assurance.json');

  assert.deepStrictEqual(calls.addAttachment, []);

  const brokenTaskImport = (() => {
    const taskLib = { __esModule: true, exist: () => true };
    const wrapped = taskLib && taskLib.__esModule ? taskLib : { default: taskLib, ...taskLib };
    return wrapped.default;
  })();

  assert.strictEqual(brokenTaskImport, undefined);
  assert.throws(() => brokenTaskImport.exist('/tmp/trivy-assurance.json'), TypeError);

  console.log('ok publishAssuranceResults uses task-lib without .default');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
