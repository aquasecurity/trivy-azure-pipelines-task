import * as React from 'react';
import {
    BuildRestClient,
    BuildServiceIds,
    BuildStatus,
    IBuildPageData,
    IBuildPageDataService
} from "azure-devops-extension-api/Build";
import * as SDK from "azure-devops-extension-sdk";
import * as API from "azure-devops-extension-api";
import {CommonServiceIds, IProjectInfo, IProjectPageService} from "azure-devops-extension-api";
import {TimelineRecord, Attachment} from "azure-devops-extension-api/Build/Build";
import {Report} from './trivy'
import {Loading} from './Loading'
import {ReportsPane} from './ReportsPane'
import {Crash} from './Crash'

type AppState = {
    status: BuildStatus
    error: string
    reports: Report[]
    sdkReady: boolean
}

interface AppProps {
    checkInterval: number
}

export class App extends React.Component<AppProps, AppState> {

    private buildClient: BuildRestClient;
    private project: IProjectInfo;
    private buildPageData: IBuildPageData;
    public props: AppProps;

    constructor(props) {
        super(props)
        if(props.checkInterval == 0) {
            props.checkInterval = 5000
        }
        this.props = props
        this.state = {
            sdkReady: false,
            status: BuildStatus.None,
            error: "",
            reports: [],
        }
    }

    async check() {

        const build = await this.buildClient.getBuild(this.project.id, this.buildPageData.build.id)
        if ((build.status & BuildStatus.Completed) === 0) {
            this.setState({status: build.status})
            setTimeout(this.check.bind(this), this.props.checkInterval)
            return
        }

        const timeline = await this.buildClient.getBuildTimeline(this.project.id, build.id)
        const recordIds: string[] = []
        timeline.records.forEach(function (record: TimelineRecord) {
            if (record.type == "Task" && record.name == "trivy") {
                recordIds.push(record.id)
            }
        })
        if (recordIds.length === 0) {
            this.setState({error: "Timeline record(s) missing: cannot load results. Is Trivy configured to run on this build?"})
            return
        }
        const attachments = await this.buildClient.getAttachments(this.project.id, build.id, "JSON_RESULT")
        if (attachments.length === 0) {
            this.setState({error: "No attachments found: cannot load results. Did Trivy run properly?"})
            return
        }

        const reports: Report[] = []

        attachments.forEach(function (attachment: Attachment) {
            recordIds.forEach(async function (recordId) {
                const buffer = await this.buildClient.getAttachment(
                    this.project.id,
                    build.id,
                    timeline.id,
                    recordId,
                    "JSON_RESULT",
                    attachment.name,
                )
                const report = this.decodeReport(buffer)
                reports.push(report)
                console.log(report)
            }.bind(this))
        }.bind(this))
        console.log(reports)
        this.setState({status: build.status, reports: reports})
    }

    setError(msg: string) {
        this.setState({error: msg})
    }

    async componentDidMount() {
        setTimeout((function () {
            if (!this.state.sdkReady) {
                this.setError("Azure DevOps SDK failed to initialise.")
            }
        }).bind(this), 5000)
        SDK.init().then(() => {
            SDK.ready().then(async () => {
                this.setState({sdkReady: true})
                const buildPageService: IBuildPageDataService = await SDK.getService(BuildServiceIds.BuildPageDataService);
                this.buildPageData = await buildPageService.getBuildPageData();
                const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
                this.project = await projectService.getProject();
                this.buildClient = API.getClient(BuildRestClient)
                await this.check()
            }).catch((e) => this.setError.bind(this)("Azure DevOps SDK failed to enter a ready state: " + e))
        }).catch((e) => this.setError.bind(this)("Azure DevOps SDK failed to initialise: " + e))
    }

    decodeReport(buffer: ArrayBuffer): Report {
        let output = '';
        const arr = new Uint8Array(buffer);
        const len = arr.byteLength;
        for (let i = 0; i < len; i++) {
            output += String.fromCharCode(arr[i]);
        }
        return JSON.parse(output);
    }

    render() {
        return (
            this.state.status == BuildStatus.Completed ?
                <ReportsPane reports={this.state.reports}/>
                :
                (this.state.error !== "" ?
                        <Crash message={this.state.error}/>
                        :
                        <Loading status={this.state.status}/>
                )
        )
    }
}
