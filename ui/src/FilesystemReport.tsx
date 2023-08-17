import * as React from 'react';
import {AssuranceReport, getReportTitle, Report} from './trivy';
import {BaseReport} from "./BaseReport";
import {ReportStats} from "./ReportStats";

interface FilesystemReportProps {
    report: Report
    assurance: AssuranceReport | undefined
}

export class FilesystemReport extends React.Component<FilesystemReportProps> {

    public props: FilesystemReportProps

    constructor(props: FilesystemReportProps) {
        super(props)
        this.props = props
    }

    render() {
        return (
            <div className="flex-grow">
                <h2>{getReportTitle(this.props.report)}</h2>
                <div className="flex-row" style={{paddingBottom: "5px"}}>
                    <ReportStats report={this.props.report}/>
                </div>
                <div className="flex-row">
                    <BaseReport report={this.props.report} assurance={this.props.assurance}/>
                </div>
            </div>
        )
    }
}
