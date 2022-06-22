import * as React from 'react';
import {Tab, TabBar, TabSize} from "azure-devops-ui/Tabs";
import {ArtifactType, countReportIssues, Report} from './trivy';
import {ImageReport} from "./ImageReport";
import {FilesystemReport} from "./FilesystemReport";

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
        this.props = props
        this.state = {
            selectedTabId: "summary"
        }
    }

    private onSelectedTabChanged = (newTabId: string) => {
        this.setState({selectedTabId: newTabId});
    };

    private renderSummary = () => {
        return (
            <div className="flex-column">
                <p>summary goes here</p>
            </div>
        )
    }

    render() {
        return (
            <div className="flex-column">
                <TabBar
                    onSelectedTabChanged={this.onSelectedTabChanged}
                    selectedTabId={this.state.selectedTabId}
                    tabSize={TabSize.Tall}
                >
                    <Tab id="summary" name="Summary" key="summary"/>
                    {
                        this.props.reports.map(function (report: Report, index: number) {
                            console.log("REPORT")
                            console.log(report)
                            return (
                                <Tab
                                    key={index}
                                    id={index + ""}
                                    name={report.ArtifactType + ": " + report.ArtifactName}
                                    badgeCount={countReportIssues(report)}
                                />
                            )
                        })
                    }
                </TabBar>
                {
                    this.state.selectedTabId == "summary" ?
                        this.renderSummary() :
                        () => {
                            const report = this.props.reports[parseInt(this.state.selectedTabId)]
                            return (
                                report.ArtifactType == ArtifactType.Image ?
                                    <ImageReport report={report}/> :
                                    <FilesystemReport report={report}/>
                            )
                        }
                }
            </div>
        )
    }
}
