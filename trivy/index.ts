import * as os from 'os';
import * as util from 'util';
import * as tool from 'azure-pipelines-tool-lib';
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import task = require('azure-pipelines-task-lib/task');

const templateUrl = "https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/junit.tpl";

async function run() {
    try {
        if(os.platform() != "linux") {
            throw new Error("cannot run on non-Linux system")
        }
        let url = getArtifactURL()
        let localPath = "/tmp/trivy.tar.gz"
        task.rmRF(localPath);
        let downloadPath = await tool.downloadTool(url, localPath);

        await tool.extractTar(downloadPath, "/tmp")

        let binPath = "/tmp/trivy"

        await task.exec('chmod', ["+x", binPath]);
        let templatePath = "/tmp/junit.tpl"
        task.rmRF(templatePath);
        await tool.downloadTool(templateUrl, templatePath)

        let outputPath = "/tmp/trivy.xml"
        task.rmRF(outputPath);

        let runner : ToolRunner = task.tool(binPath);
        runner.line(util.format("fs --exit-code 13 --output %s --template \"@%s\" --format template --security-checks vuln,config,secret", outputPath, templatePath));
        runner.arg(task.cwd());
        let result = runner.execSync();
        if(result.code === 0) {
            task.setResult(task.TaskResult.Succeeded, "No problems found.")
        }else if (result.code === 13){
            task.setResult(task.TaskResult.Failed, "Failed (problems found).")
        }else{
            task.setResult(task.TaskResult.Failed, "Error: " + result.stderr)
        }
        const publisher: task.TestPublisher = new task.TestPublisher('JUnit');
        publisher.publish(outputPath, 'true', '', '', "trivy", 'true', "trivy");
    }
    catch (err: any) {
        task.setResult(task.TaskResult.Failed, err.message);
    }
}

function getArtifactURL(): string {
    let version: string | undefined = task.getInput('version', true);
    if (version === undefined) {
        return ""
    }
    let cleanVersion = version
    if (version.length > 0 && version[0] == 'v') {
        cleanVersion = version.substring(1)
    }else{
        version = "v" + version;
    }
    let arch = ""
    switch (os.arch()) {
        case "arm":
            arch = "ARM"
        break;
        case "arm64":
            arch = "ARM64"
        break;
        case "s390x":
            arch = "s390x"
        break;
        case "x64":
            arch = "64bit"
        break;
        case "ia32":
            arch = "32bit"

        break;
        default:
                throw new Error("unsupported architecture: " + os.arch());
    }
    let artifact: string = util.format("trivy_%s_Linux-%s.tar.gz", cleanVersion, arch);
    return util.format("https://github.com/aquasecurity/trivy/releases/download/%s/%s",version as string, artifact);
}

run();