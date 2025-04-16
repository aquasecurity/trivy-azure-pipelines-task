import path from 'path';
import task = require('azure-pipelines-task-lib/task');
import { createRunner } from './runner';
import { TaskInputs } from './inputs';

type Report = {
  name: string;
  extension: string;
};

const reports: Report[] = [
  { name: 'asff', extension: '.json' },
  { name: 'cosign', extension: '.json' },
  { name: 'cyclonedx', extension: '.json' },
  { name: 'github', extension: '.gsbom' },
  { name: 'html', extension: '.html' },
  { name: 'junit', extension: '.xml' },
  { name: 'sarif', extension: '.json' },
  { name: 'spdx', extension: '.tag' },
  { name: 'spdxjson', extension: '.json' },
  { name: 'table', extension: '.md' },
];

export async function generateReports(inputs: TaskInputs, filePath: string) {
  if (!task.exist(filePath)) {
    task.error('Json results file does not exist.');
    return;
  }
  console.log('##[section]Generating reports...');

  // Get the artifact name from the file path
  const artifactName = path.basename(filePath, path.extname(filePath));

  // Process JSON results
  task.addAttachment('JSON_RESULT', path.basename(filePath), filePath);
  task.setVariable('jsonReport', filePath, false, true);
  if (inputs.publish) {
    task.uploadArtifact(artifactName, filePath, artifactName);
  }

  // Process requested reports
  const requestedReports = reports.filter((item) =>
    inputs.reports.includes(item.name)
  );

  const templatesPath = getTemplatesPath(inputs);

  for (const report of requestedReports) {
    task.debug(`Generating: ${report.name} report`);
    const format = getReportFormat(report.name);
    const output = `${filePath.replace(/json$/, report.name)}${report.extension}`;
    const outputKey = `${report.name}Report`;
    const template = '@' + path.join(templatesPath, `${report.name}.tpl`);

    try {
      await convertReport(inputs, format, template, output, filePath);
      task.debug(`Generated  ${report.name} report at ${output}`);
      task.addAttachment(outputKey, path.basename(output), output);
      task.setVariable(outputKey, output, false, true);
      if (inputs.publish) {
        task.uploadArtifact(artifactName, output, artifactName);
      }
    } catch (error) {
      task.error(`Failed to generate ${report.name} report: ${error}`);
    }
  }
}

async function convertReport(
  inputs: TaskInputs,
  format: string,
  template: string,
  output: string,
  filename: string
) {
  const runner = await createRunner(inputs);
  runner.arg('convert');
  runner.arg(['--format', format]);
  runner.argIf(format === 'template', ['--template', template]);
  runner.arg(['--output', output]);
  runner.arg(filename);
  const result = runner.execSync();

  if (result.code !== 0) {
    throw new Error(result.stderr);
  }
}

function getTemplatesPath(inputs: TaskInputs): string {
  if (inputs.templates) {
    return inputs.templates;
  } else if (inputs.method === 'docker') {
    return path.join('/', 'contrib');
  } else {
    return path.join(path.dirname(task.which('trivy', false)), 'contrib');
  }
}

function getReportFormat(name: string): string {
  switch (name) {
    case 'spdxjson':
      return 'spdx-json';
    case 'cosign':
      return 'cosign-vuln';
    case 'asff':
      return 'template';
    case 'html':
      return 'template';
    case 'junit':
      return 'template';
    default:
      return name;
  }
}
