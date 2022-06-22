export enum ArtifactType {
    Image = "container_image",
    FileSystem = "filesystem"
}

export enum Severity {
    Critical = "CRITICAL",
    High = "HIGH",
    Medium = "MEDIUM",
    Low = "LOW",
    None = ""
}

export enum Class {
    Secret = "secret",
    Config = "config",
    OSPackages = "os-pkgs",
    LanguagePackages = "lang-pkgs",
    Custom = "custom"
}

export interface Vulnerability {
    VulnerabilityID: string
    PkgName: string
    InstalledVersion: string
    FixedVersion: string
    PrimaryURL: string
    Title: string
    Description: string
    Severity: Severity,
}

export interface Secret {
    RuleID: string
    Category: string
    Severity: Severity,
    Title: string
    StartLine: number
    EndLine: number
    Match: string
}

interface CauseMetadata {
    StartLine: number
    EndLine: number
}

export interface Misconfiguration {
    ID: string
    Title: string
    Description: string
    Message: string
    Query: string
    Resolution: string
    Severity: Severity,
    PrimaryURL: string
    CauseMetadata: CauseMetadata
}

export interface Result {
    Target: string
    Class: Class
    Type: string
    Vulnerabilities: Vulnerability[]
    Secrets: Secret[]
    Misconfigurations: Misconfiguration[]
}


interface RootFS {
    type: string
    diff_ids: string[]
}

interface Config {
    Cmd: string[]
    Env: Map<string, string>
    Image: string
}

interface ImageConfig {
    architecture: string
    container: string
    created: string
    docker_version: string
    history: History[]
    os: string
    rootfs: RootFS
    config: Config
}

interface History {
    created_by: string
    created: string
    empty_layer: boolean
}

interface Metadata {
    OS: OSMetadata
    ImageID: string
    DiffIDs: string[]
    RepoTags: string[]
    RepoDigests: string[]
    ImageConfig: ImageConfig
}

interface OSMetadata {
    Family: string
    Name: string
}

export interface Report {
    ArtifactName: string
    ArtifactType: ArtifactType
    Metadata: Metadata
    Results: Result[]
}

export function countReportIssues(report: Report): number {
    return countReportMisconfigurations(report) + countReportVulnerabilities(report) + countReportSecrets(report)
}

export function countReportVulnerabilities(report: Report): number {
    let total = 0
    report.Results.forEach(function (result: Result) {
        if(typeof result.Vulnerabilities != undefined && result.Vulnerabilities !== null) {
            total += result.Vulnerabilities.length
        }
    })
    return total
}

export function countReportMisconfigurations(report: Report): number {
    let total = 0
    report.Results.forEach(function (result: Result) {
        if(typeof result.Misconfigurations != undefined && result.Misconfigurations !== null) {
            total += result.Misconfigurations.length
        }
    })
    return total
}


export function countReportSecrets(report: Report): number {
    let total = 0
    report.Results.forEach(function (result: Result) {
        if(typeof result.Secrets != undefined && result.Secrets !== null) {
            total += result.Secrets.length
        }
    })
    return total
}


