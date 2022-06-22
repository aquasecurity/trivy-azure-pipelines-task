import * as React from 'react';
import {Report} from './trivy';
import {BaseReport} from "./BaseReport";
import {ReportStats} from "./ReportStats";

interface FilesystemReportProps {
    report: Report
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
                <div className="flex-row">
                    <ReportStats report={this.props.report}/>
                </div>
                <div className="flex-row">
                    <BaseReport report={this.props.report}/>
                </div>
            </div>
        )
    }
}
