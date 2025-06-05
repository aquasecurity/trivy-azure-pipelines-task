# Aqua Trivy Azure DevOps Pipeline Task Documentation

Welcome to the Aqua Trivy Azure DevOps Pipeline Task documentation. This extension helps you scan for vulnerabilities, misconfigurations, secrets, and license issues directly within your Azure DevOps pipelines.

## Getting Started

- [Installation Guide](installation.md) - Learn how to install the extension from the marketplace
- [Trivy@1 Configuration](trivyv1.md) - Original version of the task
- [Trivy@2 Configuration](trivyv2.md) - Enhanced version with additional features (recommended for new users)
- [Aqua Connected Service Configuration](connectedservice.md) - Set up Aqua Platform integration

## Scanning Capabilities

### Supported Targets

- **File System Scanning**: Scan project files and directories
- **Container Image Scanning**: Scan container images for vulnerabilities
- **Repository Scanning**: Scan Git repositories (available in Trivy@2)

### Detection Types

The task can detect:

- **Vulnerabilities**: Find known CVEs in your dependencies
- **Misconfigurations**: Identify security issues in IaC files
- **Secrets**: Detect accidentally committed credentials
- **License Issues**: Identify software license compliance concerns

## Platform Support

### Agent Compatibility

| Agent OS | Run binary | Scan File System | Docker |
| :------- | :--------: | :--------------: | :----: |
| Linux    |     ✅     |        ✅        |   ✅   |
| MacOS    |     ✅     |        ✅        |   🔴   |
| Windows  |     ✅     |        ✅        |   🔴   |

Docker-related functionality is only fully supported on Linux agents.

### Self-Hosted Agents

For self-hosted agents, please note:

- Access to Docker Engine is required to run Trivy in a container or scan Docker images
- Windows agents have limited Docker support (see main README)

## Features

### Aqua Platform Integration

- **Trivy@1**: Configure using API key/secret in pipeline variables
- **Trivy@2**: Use the [Aqua Connected Service](connectedservice.md) for streamlined configuration

### Reporting Options

The task can generate reports in multiple formats:

- JSON (always generated)
- SARIF for code scanning integration
- CycloneDX and SPDX for SBOM purposes
- HTML and tabular reports for human readability
- Additional format options based on task version

## Examples

Each configuration guide includes examples for:

- Basic scanning configurations
- Working with private container registries
- Integrating with Aqua Platform
- Publishing scan results as Azure DevOps artifacts

## Support

If you need help or have questions:

- Check the configuration guides for your task version
- Visit the [Trivy documentation](https://aquasecurity.github.io/trivy/)
- Report issues on [GitHub](https://github.com/aquasecurity/trivy-azure-pipelines-task/issues)
