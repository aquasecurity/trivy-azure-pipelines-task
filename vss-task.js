const fs = require('fs');
const path = require('path');

const config = {
  public: {
    id: '8f9cb13f-f551-439c-83e4-fac6801c3fab',
    name: 'trivy',
    friendlyName: 'Trivy',
  },
  private: {
    id: '3612b9ee-fd2a-11ef-8d14-00155d47a2a9',
    name: 'trivy-dev',
    friendlyName: 'Trivy [Dev]',
  },
};

function getTaskVersion(version) {
  const [major, minor, patch] = version.split('.').map((num) => parseInt(num, 10));
  return { Major: major, Minor: minor, Patch: patch };
}

function updateJsonFile(filePath, updates) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonObject = JSON.parse(data);

    Object.assign(jsonObject, updates);

    fs.writeFileSync(filePath, JSON.stringify(jsonObject, null, 2) + '\n', 'utf8');
    console.log(`Applied task config: ${JSON.stringify(updates, null, 2)}`);
  } catch (error) {
    console.error('Error updating JSON file:', error);
  }
}

function updateTask(extensionType, version) {
  const taskVersion = getTaskVersion(version);
  const filePath = path.join('trivy-task', 'task.json');
  const updates = {
    name: config[extensionType].name,
    version: taskVersion,
    id: config[extensionType].id,
    friendlyName: config[extensionType].friendlyName,
  };

  updateJsonFile(filePath, updates);
}

module.exports = { updateTask };
