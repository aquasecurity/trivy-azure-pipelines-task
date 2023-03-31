import * as os from 'os';
import * as util from 'util';
import * as tool from 'azure-pipelines-tool-lib';
import {ToolRunner} from 'azure-pipelines-task-lib/toolrunner';
import task = require('azure-pipelines-task-lib/task');

const latestTrivyVersion = "v0.29.2"
const tmpPath = "/tmp/"

async function run() {

    console.log("Preparing output location...")
    const outputPath = tmpPath + "trivy-results-" + Math.random() + ".json";
    task.rmRF(outputPath);

    let scanPath = task.getInput("path", false)
    let image = task.getInput("image", false)
    let loginDockerConfig = task.getBoolInput("loginDockerConfig", false)
    let ignoreUnfixed = task.getBoolInput("ignoreUnfixed", false)
    let severities = task.getInput("severities", false) ?? ""
    let options = task.getInput("options", false) ?? ""

    if (scanPath === undefined && image === undefined) {
        throw new Error("You must specify something to scan. Use either the 'image' or 'path' option.")
    }
    if (scanPath !== undefined && image !== undefined) {
        throw new Error("You must specify only one of the 'image' or 'path' options. Use multiple task definitions if you want to scan multiple targets.")
    }

    const hasAccount = hasAquaAccount()
    const assurancePath = tmpPath + "trivy-assurance-" + Math.random() + ".json";

    if(hasAccount) {
        task.rmRF(assurancePath);
        const credentials = getAquaAccount()
        process.env.AQUA_KEY = credentials.key
        process.env.AQUA_SECRET = credentials.secret
        process.env.TRIVY_RUN_AS_PLUGIN = "aqua"
        process.env.OVERRIDE_REPOSITORY = task.getVariable("Build.Repository.Name")
        process.env.OVERRIDE_BRANCH = task.getVariable("Build.SourceBranchName")
        process.env.AQUA_ASSURANCE_EXPORT = assurancePath
    }

    const runner = await createRunner(task.getBoolInput("docker", false), loginDockerConfig);

    if (task.getBoolInput("debug", false)) {
        runner.arg("--debug")
    }

    if (scanPath !== undefined) {
        configureScan(runner, "fs", scanPath, outputPath, severities, ignoreUnfixed, options)
    } else if (image !== undefined) {
        configureScan(runner, "image", image, outputPath, severities, ignoreUnfixed, options)
    }

    console.log("Running Trivy...")
    let result = runner.execSync();
    if (result.code === 0) {
        task.setResult(task.TaskResult.Succeeded, "No problems found.")
    } else {
        task.setResult(task.TaskResult.Failed, "Failed: Trivy detected problems.")
    }

    if(hasAccount) {
        console.log("Publishing JSON assurance results...")
        task.addAttachment("ASSURANCE_RESULT", "trivy-assurance-" + Math.random() + ".json", assurancePath)
    }

    console.log("Publishing JSON results...")
    task.addAttachment("JSON_RESULT", "trivy" +  Math.random() + ".json", outputPath)
    console.log("Done!");
}

function isDevMode(): boolean {
    return task.getBoolInput("devMode", false)
}

function hasAquaAccount(): boolean {
    const credentials = getAquaAccount()
    return (credentials.key !== undefined && credentials.secret !== undefined)
}

interface aquaCredentials {
    key: string | undefined
    secret: string | undefined
}

function getAquaAccount(): aquaCredentials {
    const key = task.getInput("aquaKey", false)
    const secret = task.getInput("aquaSecret", false)
    return {
        key: key,
        secret: secret,
    }
}

async function createRunner(docker: boolean, loginDockerConfig: boolean): Promise<ToolRunner> {
    const version: string | undefined = task.getInput('version', true);
    if (version === undefined) {
        throw new Error("version is not defined")
    }

    if (!docker) {
        console.log("Run requested using local Trivy binary...")
        const trivyPath = await installTrivy(version)
        return task.tool(trivyPath);
    }

    console.log("Run requested using docker...")
    const runner = task.tool("docker");
    const home = require('os').homedir();
    const cwd = process.cwd()

    runner.line("run --rm")
    loginDockerConfig ? runner.line("-v " + task.getVariable("DOCKER_CONFIG") + ":/root/.docker") :  runner.line("-v " + home + "/.docker:/root/.docker")
    runner.line("-v /tmp:/tmp")
    runner.line("-v " + cwd + ":/src")
    runner.line("--workdir /src")
    if(hasAquaAccount()) {
        runner.line("-e TRIVY_RUN_AS_PLUGIN")
        runner.line("-e AQUA_KEY")
        runner.line("-e AQUA_SECRET")
        runner.line("-e OVERRIDE_REPOSITORY")
        runner.line("-e OVERRIDE_BRANCH")
        runner.line("-e AQUA_ASSURANCE_EXPORT")
        if (isDevMode()) {
            runner.line("-e AQUA_URL=https://api-dev.aquasec.com/v2/build")
            runner.line("-e CSPM_URL=https://stage.api.cloudsploit.com/v2/tokens")
        }
    }
    runner.line("aquasec/trivy:" + stripV(version))
    return runner
}

function configureScan(runner: ToolRunner, type: string, target: string, outputPath: string, severities: string, ignoreUnfixed: boolean, options: string) {
    console.log("Configuring options for image scan...")
    let exitCode = task.getInput("exitCode", false)
    if (exitCode === undefined) {
        exitCode = "1"
    }
    runner.arg([type]);
    runner.arg(["--exit-code", exitCode]);
    runner.arg(["--format", "json"]);
    runner.arg(["--output", outputPath]);
    runner.arg(["--security-checks", "vuln,config,secret"])
    if (severities.length) {
        runner.arg(["--severity", severities]);
    }
    if (ignoreUnfixed) {
        runner.arg(["--ignore-unfixed"]);
    }
    if (options.length) {
        runner.line(options)
    }

    runner.arg(target)
}

async function installTrivy(version: string): Promise<string> {

    console.log("Finding correct Trivy version to install...")

    if (os.platform() == "win32") {
        throw new Error("Windows is not currently supported")
    }
    if (os.platform() != "linux") {
        throw new Error("Only Linux is currently supported")
    }

    let url = await getArtifactURL(version)

    let bin = "trivy"

    let localPath = tmpPath + bin;
    task.rmRF(localPath);

    console.log("Downloading Trivy...")
    let downloadPath = await tool.downloadTool(url, localPath);

    console.log("Extracting Trivy...")
    await tool.extractTar(downloadPath, tmpPath)
    const binPath = tmpPath + bin

    console.log("Setting permissions...")
    await task.exec('chmod', ["+x", binPath]);
    return binPath
}

function stripV(version: string): string {
    if (version.length > 0 && version[0] === 'v') {
        version = version?.substring(1)
    }
    return version
}

async function getArtifactURL(version: string): Promise<string> {
    if(version === "latest") {
        version = latestTrivyVersion
    }
    console.log("Required Trivy version is " + version)
    let arch = ""
    switch (os.arch()) {
        case "arm":
            arch = "ARM"
            break
        case "arm64":
            arch = "ARM64"
            break
        case "x32":
            arch = "32bit"
            break
        case "x64":
            arch = "64bit"
            break
        default:
            throw new Error("unsupported architecture: " + os.arch())
    }
    // e.g. trivy_0.29.1_Linux-ARM.tar.gz
    let artifact: string = util.format("trivy_%s_Linux-%s.tar.gz", stripV(version), arch);
    return util.format("https://github.com/aquasecurity/trivy/releases/download/%s/%s", version, artifact);
}

run().catch((err: Error) => {
    task.setResult(task.TaskResult.Failed, err.message);
})
