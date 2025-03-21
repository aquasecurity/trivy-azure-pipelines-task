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

function updateJsonFile(filePath, updates) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonObject = JSON.parse(data);

    updates.version = {
      Major: jsonObject.version.Major,
      Minor: jsonObject.version.Minor,
      // Set patch to the current build number or increment it
      Patch: process.env.BUILD_NUMBER || jsonObject.version.Patch + 1,
    };

    Object.assign(jsonObject, updates);

    fs.writeFileSync(filePath, JSON.stringify(jsonObject, null, 2) + '\n', 'utf8');
    console.log(`Applied config for ${filePath}: ${JSON.stringify(updates, null, 2)}`);
  } catch (error) {
    console.error('Error updating JSON file:', error);
  }
}

function updateTask(extensionType) {
  const tasks = ['trivyV1', 'trivyV2'];
  const updates = {
    name: config[extensionType].name,
    id: config[extensionType].id,
    friendlyName: config[extensionType].friendlyName,
  };

  tasks.forEach((task) => {
    updateJsonFile(path.join('trivy-task', task, 'task.json'), updates);
  });
}

module.exports = { updateTask };
