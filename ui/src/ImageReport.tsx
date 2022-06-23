import * as React from 'react';
import {getReportTitle, Report} from './trivy';
import {BaseReport} from "./BaseReport";
import {ReportStats} from "./ReportStats";

interface ImageReportProps {
    report: Report
}

export class ImageReport extends React.Component<ImageReportProps> {

    public props: ImageReportProps

    constructor(props: ImageReportProps) {
        super(props)
        this.props = props
    }

    render() {
        return (
            <div className="flex-grow">
                <h2>{getReportTitle(this.props.report)}</h2>
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
