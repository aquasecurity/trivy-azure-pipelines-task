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
import {Attachment, TimelineRecord, TimelineRecordState} from "azure-devops-extension-api/Build/Build";
import {Report, AssuranceReport} from './trivy'
import {Loading} from './Loading'
import {ReportsPane} from './ReportsPane'
import {Crash} from './Crash'

type AppState = {
    status: TimelineRecordState
    error: string
    reports: Report[]
    assuranceReports: AssuranceReport[]
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
        if (props.checkInterval == 0) {
            props.checkInterval = 5000
        }
        this.props = props
        this.state = {
            sdkReady: false,
            status: TimelineRecordState.Pending,
            error: "",
            reports: [],
            assuranceReports: [],
        }
    }

    async check() {

        const build = await this.buildClient.getBuild(this.project.id, this.buildPageData.build.id)
        // if the build isn't running/finished, try again shortly
        if ((build.status & BuildStatus.Completed) === 0 && (build.status & BuildStatus.InProgress) === 0) {
            this.setState({status: TimelineRecordState.Pending})
            setTimeout(this.check.bind(this), this.props.checkInterval)
            return
        }

        const timeline = await this.buildClient.getBuildTimeline(this.project.id, build.id)
        const recordIds: string[] = []
        const recordStates: TimelineRecordState[] = []
        timeline.records.forEach(function (record: TimelineRecord) {
            if (record.type == "Task" && record.task !== null && record.task.name == "trivy") {
                recordIds.push(record.id)
                recordStates.push(record.state)
            }
        })
        if (recordIds.length === 0) {
            setTimeout(this.check.bind(this), this.props.checkInterval)
            return
        }
        let worstState: TimelineRecordState = 999
        recordStates.forEach(function (state: TimelineRecordState) {
            if (state < worstState) {
                worstState = state
            }
        })
        if (worstState !== TimelineRecordState.Completed) {
            this.setState({status: worstState})
            setTimeout(this.check.bind(this), this.props.checkInterval)
            return
        }
        const attachments = await this.buildClient.getAttachments(this.project.id, build.id, "JSON_RESULT")
        if (attachments.length === 0) {
            this.setState({error: "No attachments found: cannot load results. Did Trivy run properly?"})
            return
        }

        this.setState({status: worstState})

        attachments.forEach(function (attachment: Attachment) {
            recordIds.forEach(async function (recordId) {
                try {
                    const buffer = await this.buildClient.getAttachment(
                        this.project.id,
                        build.id,
                        timeline.id,
                        recordId,
                        "JSON_RESULT",
                        attachment.name,
                    )
                    const report = this.decodeReport(buffer)
                    this.setState(prevState => ({
                        reports: [...prevState.reports, report]
                    }))
                }catch{
                    console.log("Failed to decode results attachment")
                }
            }.bind(this))
        }.bind(this))

        // check if we have assurance results
        const assuranceAttachments = await this.buildClient.getAttachments(this.project.id, build.id, "ASSURANCE_RESULT")
        if (assuranceAttachments.length > 0) {
            assuranceAttachments.forEach(function (attachment: Attachment) {
                recordIds.forEach(async function (recordId) {
                    try {
                        const buffer = await this.buildClient.getAttachment(
                            this.project.id,
                            build.id,
                            timeline.id,
                            recordId,
                            "ASSURANCE_RESULT",
                            attachment.name,
                        )
                        const report = this.decodeAssuranceReport(buffer)
                        this.setState(prevState => ({
                            assuranceReports: [...prevState.assuranceReports, report]
                        }))
                    }catch{
                        console.log("Failed to decode assurance attachment")
                    }
                }.bind(this))
            }.bind(this))
        }
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

    decodeAssuranceReport(buffer: ArrayBuffer): AssuranceReport {
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
            this.state.status == TimelineRecordState.Completed ?
                <ReportsPane reports={this.state.reports} assuranceReports={this.state.assuranceReports}/>
                :
                (this.state.error !== "" ?
                        <Crash message={this.state.error}/>
                        :
                        <Loading status={this.state.status}/>
                )
        )
    }
}
