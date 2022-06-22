import * as React from 'react';
import {Report} from './trivy';
import {BaseReport} from "./BaseReport";

interface FilesystemReportProps {
    report: Report
}

interface FilesystemReportState {
    nothing: boolean
}

export class FilesystemReport extends React.Component<FilesystemReportProps, FilesystemReportState> {

    public props: FilesystemReportProps
    public state: FilesystemReportState

    constructor(props: FilesystemReportProps) {
        super(props)
        this.props = props
        this.state = {
            nothing: true
        }
    }

    render() {
        // TODO add filesystem info
        return (
            <BaseReport report={this.props.report}/>
        )
    }
}
