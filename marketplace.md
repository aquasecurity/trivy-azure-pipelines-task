# trivy

An Azure DevOps Pipelines Task for [Trivy](https://github.com/aquasecurity/trivy), with an integrated UI.

![Screenshot showing the trivy extension in the Azure Devops UI](screenshot.png)

## Installation

1. Install the Trivy task in your Azure DevOps organization (hit the `Get it free` button above).

2. Add the task to your `azure-pipelines.yml` in a project where you'd like to run trivy:

```yaml
- task: trivy@1
```

## Configuration

You can supply several inputs to customise the task.

| Input        | Description                                                                                                                          |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `version`    | The version of Trivy to use. Currently defaults to `latest`.                                                                         |
| `docker`     | Run Trivy using the aquasec/trivy docker image. Alternatively the Trivy binary will be run natively. Defaults to `true`.             |
| `debug`      | Enable debug logging in the build output.                                                                                            |
| `path`       | The path to scan relative to the root of the repository being scanned, if an `fs` scan is required. Cannot be set if `image` is set. |
| `image`      | The image to scan if an `image` scan is required. Cannot be set if `path` is set.                                                    |
| `severity`   | The severity level of vulnerabilities to be displayed (comma separated). Defaults to `UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL`.             |
| `exitCode`   | The exit-code to use when Trivy detects issues. Set to `0` to prevent the build failing when Trivy finds issues. Defaults to `1`.    |
| `aquaKey`    | The Aqua API Key to use to link scan results to your Aqua Security account _(not required)_.                                         |
| `aquaSecret` | The Aqua API Secret to use to link scan results to your Aqua Security account _(not required)_.                                      |

### Example of scanning multiple targets

```yaml
trigger:
- main

pool:
  vmImage: ubuntu-latest

jobs:
- job: Scan the local project
  steps:
  - task: trivy@1
    inputs:
      path: .
- job: Scan the ubuntu image
  steps:
  - task: trivy@1
    inputs:
      image: ubuntu
```

## Scanning Images in Private Registries

You can scan images in private registries by using the `image` input after completing a `docker login`. For example:

```yaml
steps:
- task: Docker@2
  displayName: Login to ACR
  inputs:
    command: login
    containerRegistry: dockerRegistryServiceConnection1
- task: trivy@1
  inputs:
    image: my.registry/org/my-image:latest
```
