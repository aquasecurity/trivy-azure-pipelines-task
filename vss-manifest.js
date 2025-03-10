const { updateTask } = require('./vss-task');

if (!process.env.RELEASE_VERSION) {
  throw new Error('RELEASE_VERSION is not set');
}

const releaseVersion = process.env.RELEASE_VERSION.trim().replace(/v|dev/g, '');
const releaseType = process.env.RELEASE_VERSION.includes('dev') ? 'private' : 'public';
const devBaseUri = process.env.DEV_BASE_URI ?? 'https://localhost:3000';

updateTask(releaseType, releaseVersion);

module.exports = () => {
  return {
    manifestVersion: 1,
    id: `trivy-official${releaseType === 'public' ? '' : '-dev'}`,
    name: `trivy${releaseType === 'public' ? '' : '-dev'}`,
    version: releaseVersion,
    publisher: 'AquaSecurityOfficial',
    description:
      "Trivy is the world's most popular open source vulnerability and misconfiguration scanner. " +
      'It is reliable, fast, extremely easy to use, and it works wherever you need it.',
    repository: {
      type: 'git',
      uri: 'https://github.com/aquasecurity/trivy-azure-pipelines-task',
    },
    public: releaseType === 'public',
    categories: ['Azure Pipelines'],
    targets: [{ id: 'Microsoft.VisualStudio.Services' }],
    tags: ['trivy', 'vulnerability', 'security', 'scanner'],
    icons: { default: 'icon.png' },
    baseUri: releaseType === 'public' ? null : devBaseUri,
    files: [
      { path: 'trivy-task' },
      { path: 'ui/node_modules/azure-devops-extension-sdk', addressable: true, packagePath: 'lib' },
      { path: 'LICENSE', addressable: true },
      { path: 'ui/build/main.js', addressable: true, packagePath: 'main.js' },
      { path: 'ui/build/index.html', addressable: true, packagePath: 'index.html' },
      { path: 'images/results.png', addressable: true },
      { path: 'images/resultsview.png', addressable: true },
      { path: 'images/settings.png', addressable: true },
      { path: 'images/trivytask.png', addressable: true },
      { path: 'images/trivy.png', addressable: true, packagePath: 'images/trivy.png' },
    ],
    content: {
      license: { path: 'LICENSE' },
      details: { path: 'marketplace.md' },
    },
    links: {
      home: { uri: 'https://www.aquasec.com/' },
      license: { uri: './LICENSE' },
    },
    contributions: [
      {
        id: 'custom-build-release-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'trivy-task' },
      },
      {
        id: 'trivy-tab',
        type: 'ms.vss-build-web.build-results-tab',
        description: 'Results for trivy scan(s)',
        targets: ['ms.vss-build-web.build-results-view'],
        properties: {
          name: 'Trivy',
          uri: 'index.html',
          supportsTasks: ['8f9cb13f-f551-439c-83e4-fac6801c3fab', '3612b9ee-fd2a-11ef-8d14-00155d47a2a9'],
        },
      },
    ],
    scopes: ['vso.build_execute'],
  };
};
