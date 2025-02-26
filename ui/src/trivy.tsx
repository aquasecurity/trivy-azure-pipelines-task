export enum ArtifactType {
  Image = 'container_image',
  FileSystem = 'filesystem',
}

export enum Severity {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Medium = 'MEDIUM',
  Low = 'LOW',
  None = '',
}

export enum Class {
  Secret = 'secret',
  Config = 'config',
  OSPackages = 'os-pkgs',
  LanguagePackages = 'lang-pkgs',
  Custom = 'custom',
}

export interface Vulnerability {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion: string;
  PrimaryURL: string;
  Title: string;
  Description: string;
  Severity: Severity;
}

export interface Secret {
  RuleID: string;
  Category: string;
  Severity: Severity;
  Title: string;
  StartLine: number;
  EndLine: number;
  Match: string;
}

export interface License {
  PkgName: string;
  Category: string;
  Severity: Severity;
  Name: string;
  FilePath: string;
  Confidence: number;
  Link: string;
}

interface CauseMetadata {
  StartLine: number;
  EndLine: number;
}

export interface Misconfiguration {
  ID: string;
  Title: string;
  Description: string;
  Message: string;
  Query: string;
  Resolution: string;
  Severity: Severity;
  PrimaryURL: string;
  CauseMetadata: CauseMetadata;
}

export interface Result {
  Target: string;
  Class: Class;
  Type: string;
  Vulnerabilities: Vulnerability[];
  Secrets: Secret[];
  Misconfigurations: Misconfiguration[];
  Licenses: License[];
}

interface RootFS {
  type: string;
  diff_ids: string[];
}

interface Config {
  Cmd: string[];
  Env: Map<string, string>;
  Image: string;
}

interface ImageConfig {
  architecture: string;
  container: string;
  created: string;
  docker_version: string;
  history: History[];
  os: string;
  rootfs: RootFS;
  config: Config;
}

interface History {
  created_by: string;
  created: string;
  empty_layer: boolean;
}

interface Metadata {
  OS: OSMetadata;
  ImageID: string;
  DiffIDs: string[];
  RepoTags: string[];
  RepoDigests: string[];
  ImageConfig: ImageConfig;
}

interface OSMetadata {
  Family: string;
  Name: string;
}

export interface DownloadReports {
  Name: string;
  Url: string;
}

export interface Report {
  ArtifactName: string;
  ArtifactType: ArtifactType;
  Metadata: Metadata;
  Results: Result[];
  DownloadReports: DownloadReports[];
  DisplayName: string;
}

export interface AssuranceReport {
  Report: Report;
  Results: AssuranceResult[];
}

export interface AssuranceResult {
  AVDID: string;
  Title: string;
  Message: string;
  PolicyResults: PolicyResult[];
}

export interface PolicyResult {
  PolicyID: string;
  Enforced: boolean;
  Failed: boolean;
  Reason: string;
}

export function getReportTitle(report: Report): string {
  if (report.DisplayName && report.DisplayName !== 'trivy') {
    return report.DisplayName;
  }
  switch (report.ArtifactType) {
    case ArtifactType.FileSystem:
      if (report.ArtifactName === '.') {
        return 'Filesystem: (project root)';
      }
      return 'Filesystem: ' + report.ArtifactName;
    case ArtifactType.Image:
      return 'Image: ' + report.ArtifactName;
  }
}

export function countReportIssues(report: Report): number {
  return (
    countReportMisconfigurations(report) +
    countReportVulnerabilities(report) +
    countReportSecrets(report) +
    countReportLicenses(report)
  );
}

export function countAllReportsIssues(reports: Report[]): number {
  let total = 0;
  reports?.forEach(function (report: Report) {
    total += countReportIssues(report);
  });
  return total;
}

export function countAllReportsVulnerabilities(reports: Report[]): number {
  let total = 0;
  reports?.forEach(function (report: Report) {
    total += countReportVulnerabilities(report);
  });
  return total;
}

export function countAllReportsMisconfigurations(reports: Report[]): number {
  let total = 0;
  reports?.forEach(function (report: Report) {
    total += countReportMisconfigurations(report);
  });
  return total;
}

export function countAllReportsSecrets(reports: Report[]): number {
  let total = 0;
  reports?.forEach(function (report: Report) {
    total += countReportSecrets(report);
  });
  return total;
}

export function countAllReportLicenses(reports: Report[]): number {
  let total = 0;
  reports?.forEach(function (report: Report) {
    total += countReportLicenses(report);
  });
  return total;
}

export function countReportVulnerabilities(report: Report): number {
  let total = 0;
  report.Results?.forEach(function (result: Result) {
    if (!result) {
      return;
    }

    if (
      Object.prototype.hasOwnProperty.call(result, 'Vulnerabilities') &&
      result.Vulnerabilities !== null
    ) {
      total += result.Vulnerabilities.length;
    }
  });
  return total;
}

export function countReportMisconfigurations(report: Report): number {
  let total = 0;
  report.Results?.forEach(function (result: Result) {
    if (!result) {
      return;
    }
    if (
      Object.prototype.hasOwnProperty.call(result, 'Misconfigurations') &&
      result.Misconfigurations !== null
    ) {
      total += result.Misconfigurations.length;
    }
  });
  return total;
}

export function countReportSecrets(report: Report): number {
  let total = 0;
  report.Results?.forEach(function (result: Result) {
    if (!result) {
      return;
    }
    if (
      Object.prototype.hasOwnProperty.call(result, 'Secrets') &&
      result.Secrets !== null
    ) {
      total += result.Secrets.length;
    }
  });
  return total;
}

export function countReportLicenses(report: Report): number {
  let total = 0;
  report.Results?.forEach(function (result: Result) {
    if (!result) {
      return;
    }
    if (
      Object.prototype.hasOwnProperty.call(result, 'Licenses') &&
      result.Licenses !== null
    ) {
      total += result.Licenses.length;
    }
  });
  return total;
}

export function countAssuranceIssues(assurance?: AssuranceReport): number {
  if (!assurance) {
    return 0;
  }
  if (!Object.prototype.hasOwnProperty.call(assurance, 'Results')) {
    return 0;
  }
  let total = 0;
  assurance.Results?.forEach((result) => {
    result.PolicyResults?.forEach((policyResult) => {
      if (Object.prototype.hasOwnProperty.call(policyResult, 'Failed')) {
        total++;
      }
    });
  });
  return total;
}
