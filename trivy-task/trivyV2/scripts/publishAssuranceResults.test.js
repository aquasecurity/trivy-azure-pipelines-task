const assert = require('assert');
const path = require('path');
const { publishAssuranceResults } = require('../dist/taskFlow');

async function run() {
  // hasAquaAccount is what takes the code into the task library, which is
  // where the missing default export used to surface as
  // "Cannot read properties of undefined (reading 'exist')".
  const missing = path.join(__dirname, 'no-such-assurance-file.json');
  await publishAssuranceResults({ hasAquaAccount: true }, missing, 'assurance.json');

  console.log('ok publishAssuranceResults reaches the task library');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
