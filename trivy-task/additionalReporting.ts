import task = require('azure-pipelines-task-lib/task');
import { createRunner } from './trivyLoader';
import { randomSuffix } from './utils';

const reportTypes = {
  sarif: { DisplayName: 'SARIF', Extension: '.json' },
  cyclonedx: { DisplayName: 'CycloneDX', Extension: '.xml' },
  spdx: { DisplayName: 'SPDX', Extension: '.tag' },
  json: { DisplayName: 'JSON', Extension: '.json' },
  spdxjson: { DisplayName: 'SPDX JSON', Extension: '.json' },
  cosign: { DisplayName: 'Cosign', Extension: '.json' },
  table: { DisplayName: 'Table', Extension: '.md' },
};

export async function generateAdditionalReports(
  localFilename: string,
  filename: string,
  isDocker: boolean
) {
  const jobId = task.getVariable('System.JobId') || '';
  const smallJobId = jobId.substring(0, 8);

  for (const [key, value] of Object.entries(reportTypes)) {
    task.debug(`Checking if ${key} report is required`);
    const inputKey = `${key}Output`;
    const outputKey = `${key}Report`;
    if (task.getBoolInput(inputKey, false)) {
      if (key === 'json') {
        // don't need to convert json to json
        task.setVariable(outputKey, localFilename);
        task.debug(`Uploading ${key} report...`);
        const artifactKey = `${key}-${smallJobId}-${randomSuffix(8)}`;
        task.uploadArtifact(
          artifactKey,
          localFilename,
          `${jobId}${value.DisplayName}`
        );
        continue;
      }

      console.log(`Generating ${key} report...`);
      const format = getReportFormat(key);
      const output = `${filename.replace(/json$/, format)}${value.Extension}`;
      const localOutput = `${localFilename.replace(/json$/, format)}${value.Extension}`;

      try {
        await generateReport(format, output, filename);
        console.log(`Generated ${key} report at ${output}`);
        task.setVariable(outputKey, localOutput);
        task.debug(`Uploading ${key} report...`);
        const artifactKey = `${key}-${smallJobId}-${randomSuffix(8)}`;
        task.uploadArtifact(
          artifactKey,
          localOutput,
          `${jobId}${value.DisplayName}`
        );
      } catch (error) {
        task.error(`Failed to generate ${key} report: ${error}`);
      }
    }
  }
}

async function generateReport(
  format: string,
  output: string,
  filename: string
): Promise<void> {
  const runner = await createRunner();
  runner.arg(['convert', '--format', format, '--output', output, filename]);
  const result = runner.execSync();

  if (result.code !== 0) {
    throw new Error(result.stderr);
  }
}

function getReportFormat(key: string): string {
  switch (key) {
    case 'spdxjson':
      return 'spdx-json';
    case 'cosign':
      return 'cosign-vuln';
    default:
      return key;
  }
}
