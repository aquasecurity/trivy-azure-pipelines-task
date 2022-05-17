# Trivy

1. Install the task (`AquaSecurityOfficial/trivy`) in your Azure DevOps organization.

2. Add the task to your `azure-pipelines.yml` (you currently must run the task on Linux):

```yaml
trigger: 
- main

pool:
  vmImage: ubuntu-20.04

stages:
- stage: security
  jobs:
  - job: scan
    steps:
    - task: trivy@0.1.0
      inputs:
        version: 'v0.28.0'
```
