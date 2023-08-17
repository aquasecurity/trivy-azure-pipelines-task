import * as React from 'react';
import {
    BuildRestClient,
    BuildServiceIds,
    BuildStatus,
    IBuildPageDataService
} from "azure-devops-extension-api/Build";
import * as SDK from "azure-devops-extension-sdk";
import * as API from "azure-devops-extension-api";
import { CommonServiceIds, IProjectPageService } from "azure-devops-extension-api";
import { Attachment, TimelineRecord, TimelineRecordState } from "azure-devops-extension-api/Build/Build";
import { Report, AssuranceReport, Summary } from './trivy'
import { Loading } from './Loading'
import { ReportsPane } from './ReportsPane'
import { Crash } from './Crash'

type AppState = {
    status: TimelineRecordState
    error: string
    reports: Report[]
    summary: Summary
    assuranceReports: AssuranceReport[]
    sdkReady: boolean
    attachmentRecordId: string
    attachmentTimelineId: string
    buildId: number
    projectId: string
}

interface AppProps {
    checkInterval: number
}

export class App extends React.Component<AppProps, AppState> {

    private buildClient: BuildRestClient;
    private projectId: string;
    private buildId: number;
    public props: AppProps;

    constructor(props) {
        super(props)

        this.state = {
            status: TimelineRecordState.Pending,
            error: "",
            reports: [],
            summary: { id: "", results: [] },
            assuranceReports: [],
            sdkReady: false,
            attachmentRecordId: "",
            attachmentTimelineId: "",
            buildId: 0,
            projectId: "",
        }

        this.handleGetReport = this.handleGetReport.bind(this);
    }

    async check() {
        const build = await this.buildClient.getBuild(this.projectId, this.buildId)
        this.setState({ projectId: this.projectId, buildId: this.buildId })

        // if the build isn't running/finished, try again shortly
        if ((build.status & BuildStatus.Completed) === 0 && (build.status & BuildStatus.InProgress) === 0) {
            this.setState({ status: TimelineRecordState.Pending })
            setTimeout(this.check.bind(this), this.props.checkInterval)
            return
        }

        const timeline = await this.buildClient.getBuildTimeline(this.projectId, build.id)
        this.setState({ attachmentTimelineId: timeline.id })

        const recordIds: string[] = []
        const recordStates: TimelineRecordState[] = []
        let summaryId = ""
        let attachmentRecordId = ""

        timeline.records.forEach(function (record: TimelineRecord) {
            if (record.type == "Task" && record.task !== null && record.name == "trivy") {
                recordIds.push(record.id)
                recordStates.push(record.state)
                attachmentRecordId = record.id
            }

            if (record.type == "Task" && record.task !== null && record.name == "trivy_summary") {
                summaryId = record.id
            }
        })

        if (recordIds.length === 0) {
            setTimeout(this.check.bind(this), this.props.checkInterval)
            return
        }

        this.setState({ attachmentRecordId: attachmentRecordId, attachmentTimelineId: timeline.id })

        let worstState: TimelineRecordState = 999
        recordStates.forEach(function (state: TimelineRecordState) {
            if (state < worstState) {
                worstState = state
            }
        })
        if (worstState !== TimelineRecordState.Completed) {
            this.setState({ status: worstState })
            setTimeout(this.check.bind(this), this.props.checkInterval)
            return
        }

        this.setState({ status: worstState })

        const summaryAttachments = await this.buildClient.getAttachments(this.projectId, build.id, "JSON_SUMMARY")
        if (summaryId === "" || summaryAttachments.length !== 1) {
            this.setState({ error: "No summary found: cannot load results. Did Trivy run properly?" })
            return
        }

        try {
            const buffer = await this.buildClient.getAttachment(
                this.projectId,
                build.id,
                timeline.id,
                summaryId,
                "JSON_SUMMARY",
                summaryAttachments[0].name,
            )
            const summary = this.decode<Summary>(buffer)
            this.setState({ summary: summary })
        } catch {
            console.log("Failed to decode summary attachment")
        }

        // check if we have assurance results
        const assuranceAttachments = await this.buildClient.getAttachments(this.projectId, build.id, "ASSURANCE_RESULT")
        if (assuranceAttachments.length > 0) {
            assuranceAttachments.forEach((attachment: Attachment) => {
                recordIds.forEach(async (recordId) => {
                    try {
                        const buffer = await this.buildClient.getAttachment(
                            this.projectId,
                            build.id,
                            timeline.id,
                            recordId,
                            "ASSURANCE_RESULT",
                            attachment.name,
                        )
                        const report = this.decode<AssuranceReport>(buffer)
                        this.setState(prevState => ({
                            assuranceReports: [...prevState.assuranceReports, report]
                        }))
                    } catch {
                        console.log("Failed to decode assurance attachment")
                    }
                })
            })
        }
    }

    setError(msg: string) {
        this.setState({ error: msg })
    }

    async componentDidMount() {
        setTimeout((function () {
            if (!this.state.sdkReady) {
                this.setError("Azure DevOps SDK failed to initialise.")
            }
        }).bind(this), 5000)
        SDK.init().then(() => {
            SDK.ready().then(async () => {
                this.setState({ sdkReady: true })
                const buildPageService: IBuildPageDataService = await SDK.getService(BuildServiceIds.BuildPageDataService);
                this.buildId = (await buildPageService.getBuildPageData())?.build?.id ?? 0
                const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
                this.projectId = (await projectService.getProject())?.id ?? "";
                this.buildClient = API.getClient(BuildRestClient)
                await this.check()
            }).catch((e) => this.setError.bind(this)("Azure DevOps SDK failed to enter a ready state: " + e))
        }).catch((e) => this.setError.bind(this)("Azure DevOps SDK failed to initialise: " + e))
    }

    decode<T>(buffer: ArrayBuffer): T {
        let output = '';
        const arr = new Uint8Array(buffer);
        const len = arr.byteLength;
        for (let i = 0; i < len; i++) {
            output += String.fromCharCode(arr[i]);
        }
        return JSON.parse(output);
    }

    async handleGetReport(name: string): Promise<Report | undefined> {
        const report = this.state.reports.find(r => r.ArtifactName === name)
        if (report) {
            return report
        }

        try {
            const buffer = await this.buildClient.getAttachment(
                this.state.projectId,
                this.state.buildId,
                this.state.attachmentTimelineId,
                this.state.attachmentRecordId,
                "JSON_RESULT",
                `trivy-${name}`,
            )
            const report = this.decode<Report>(buffer)
            this.setState({ reports: [...this.state.reports, report] })

            return report
        } catch (e) {
            console.log("Failed to decode results attachment")
        }

        return undefined
    }

    render() {
        return (
            this.state.status == TimelineRecordState.Completed ?
                <ReportsPane summary={this.state.summary} getReport={this.handleGetReport} assuranceReports={this.state.assuranceReports} />
                :
                (this.state.error !== "" ?
                    <Crash message={this.state.error} />
                    :
                    <Loading status={this.state.status} />
                )
        )
    }
}
