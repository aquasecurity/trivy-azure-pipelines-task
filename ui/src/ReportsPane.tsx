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
            selectedTabId: "0"
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
        const report = this.props.reports[parseInt(this.state.selectedTabId)]
        return (
            <div className="flex-column">
                {this.renderSummary()}
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
                {
                    report.ArtifactType == ArtifactType.Image ?
                        <ImageReport report={report}/> :
                        <FilesystemReport report={report}/>
                }
            </div>
        )
    }
}
