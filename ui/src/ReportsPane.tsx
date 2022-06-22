import * as React from 'react';
import {Tab, TabBar, TabSize} from "azure-devops-ui/Tabs";
import {
    ArtifactType,
    countAllReportsIssues,
    countAllReportsMisconfigurations,
    countAllReportsSecrets,
    countAllReportsVulnerabilities,
    countReportIssues,
    Report
} from './trivy';
import {ImageReport} from "./ImageReport";
import {FilesystemReport} from "./FilesystemReport";
import {MessageCard, MessageCardSeverity} from "azure-devops-ui/MessageCard";
import {Card} from "azure-devops-ui/Card";

interface ReportsPaneProps {
    reports: Report[]
}

interface ReportsPaneState {
    selectedTabId: string
}

export class ReportsPane extends React.Component<ReportsPaneProps, ReportsPaneState> {

    public props: ReportsPaneProps
    public state: ReportsPaneState

    constructor(props: ReportsPaneProps) {
        super(props)
        if (props.reports === null) {
            props.reports = []
        }
        this.props = props
        this.state = {
            selectedTabId: "0"
        }
    }

    private onSelectedTabChanged = (newTabId: string) => {
        this.setState({selectedTabId: newTabId});
    };

    render() {
        const stats = [
            {
                name: "Total Scans",
                value: this.props.reports.length,
            },
            {
                name: "Total Issues",
                value: countAllReportsIssues(this.props.reports)
            },
            {
                name: "Vulnerabilities",
                value: countAllReportsVulnerabilities(this.props.reports)
            },
            {
                name: "Misconfigurations",
                value: countAllReportsMisconfigurations(this.props.reports)
            },
            {
                name: "Secrets",
                value: countAllReportsSecrets(this.props.reports)
            }
        ]
        return (
            <div className="flex-column">
                {
                    this.props.reports.length === 0 ?
                        <MessageCard
                            className="flex-self-stretch"
                            severity={MessageCardSeverity.Info}
                        >
                            No reports found for this build. Add Trivy to your pipeline configuration or check the build
                            logs for more information.
                        </MessageCard> :
                        <div className="flex-grow">
                            <div className="flex-row">
                                <Card className="flex-grow">
                                    <div className="flex-row" style={{flexWrap: "wrap"}}>
                                        {stats.map((items, index) => (
                                            <div className="flex-column" style={{minWidth: "120px"}} key={index}>
                                                <div className="body-m secondary-text">{items.name}</div>
                                                <div className="body-m primary-text">{items.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                            <div className="flex-row">
                                <TabBar
                                    onSelectedTabChanged={this.onSelectedTabChanged}
                                    selectedTabId={this.state.selectedTabId}
                                    tabSize={TabSize.Tall}
                                >
                                    {
                                        this.props.reports.map(function (report: Report, index: number) {
                                            return (
                                                <Tab
                                                    key={index}
                                                    id={index + ""}
                                                    name={report.ArtifactType + " (" + report.ArtifactName + ")"}
                                                    badgeCount={countReportIssues(report)}
                                                />
                                            )
                                        })
                                    }
                                </TabBar>
                            </div>
                            <div className="flex-row">
                                {
                                    this.props.reports[parseInt(this.state.selectedTabId)].ArtifactType == ArtifactType.Image ?
                                        <ImageReport report={this.props.reports[parseInt(this.state.selectedTabId)]}/> :
                                        <FilesystemReport
                                            report={this.props.reports[parseInt(this.state.selectedTabId)]}/>
                                }
                            </div>
                        </div>
                }

            </div>
        )
    }
}
