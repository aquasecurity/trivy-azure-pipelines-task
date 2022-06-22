import * as os from 'os';
import * as util from 'util';
import * as tool from 'azure-pipelines-tool-lib';
import {ToolRunner} from 'azure-pipelines-task-lib/toolrunner';
import task = require('azure-pipelines-task-lib/task');

const tmpPath = "/tmp/"

async function run() {

    const version: string | undefined = task.getInput('version', true);
    if (version === undefined) {
        throw new Error("version is not defined")
    }
    const trivyPath = await installTrivy(version)

    console.log("Preparing output location...")
    let outputPath = tmpPath + "trivy-results-" + Math.random() + ".json";
    task.rmRF(outputPath);

    let scanPath = task.getInput("path", false)
    let image = task.getInput("image", false)

    if (scanPath === undefined && image === undefined) {
        throw new Error("You must specify something to scan. Use either the 'image' or 'path' option.")
    }
    if (scanPath !== undefined && image !== undefined) {
        throw new Error("You must specify only one of the 'image' or 'path' options. Use multiple task definitions if you want to scan multiple targets.")
    }

    let runner: ToolRunner = task.tool(trivyPath);
    if (task.getBoolInput("debug", false)) {
        runner.arg("--debug")
    }

    if (scanPath !== undefined) {
        configureFSScan(runner, scanPath, outputPath)
    } else if (image !== undefined) {
        configureImageScan(runner, image, outputPath)
    }

    console.log("Running Trivy...")
    let result = runner.execSync();
    if (result.code === 0) {
        task.setResult(task.TaskResult.Succeeded, "No problems found.")
    } else {
        task.setResult(task.TaskResult.Failed, "Failed: Trivy detected problems.")
    }

    console.log("Publishing JSON results...")
    task.addAttachment("JSON_RESULT", "trivy-" +  Math.random() + ".json", outputPath)
    console.log("Done!");
}

function configureImageScan(runner: ToolRunner, image: string, outputPath: string) {

    // TODO: investigate using docker instead...
    // docker run --rm -v /home/faro/.docker/config.json:/root/.docker/config.json  \
    //     -v /tmp/trivy-docker:/root/.cache/  \
    //     aquasec/trivy 123456789.dkr.ecr.eu-west-1.amazonaws.com/my-image:0.0.0.54

    console.log("Configuring options for image scan...")
    runner.arg(["image"]);
    runner.arg(["--exit-code", "1"])
    runner.arg(["--format", "json"]);
    runner.arg(["--output", outputPath]);
    runner.arg(["--security-checks", "vuln,config,secret"])
    runner.arg(image)
}

function configureFSScan(runner: ToolRunner, scanPath: string, outputPath: string) {
    console.log("Configuring options for filesystem scan...")
    runner.arg(["fs"]);
    runner.arg(["--exit-code", "1"])
    runner.arg(["--format", "json"]);
    runner.arg(["--output", outputPath]);
    runner.arg(["--security-checks", "vuln,config,secret"])
    runner.arg(scanPath)
}

async function installTrivy(version: string): Promise<string> {

    console.log("Finding correct Trivy version...")

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

async function getArtifactURL(version: string): Promise<string> {
    let nonV = version
    if (nonV.length > 0 && nonV[0] === 'v') {
        nonV = nonV?.substring(1)
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
    let artifact: string = util.format("trivy_%s_Linux-%s.tar.gz", nonV, arch);
    return util.format("https://github.com/aquasecurity/trivy/releases/download/%s/%s", version, artifact);
}

run().catch((err: Error) => {
    task.setResult(task.TaskResult.Failed, err.message);
})
