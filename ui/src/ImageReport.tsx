import * as React from 'react';
import {Report} from './trivy';
import {BaseReport} from "./BaseReport";

interface ImageReportProps {
    report: Report
}

interface ImageReportState {
    nothing: boolean
}

export class ImageReport extends React.Component<ImageReportProps, ImageReportState> {

    public props: ImageReportProps
    public state: ImageReportState

    constructor(props: ImageReportProps) {
        super(props)
        this.props = props
        this.state = {
            nothing: true
        }
    }

    render() {
        // TODO add image info
        return (
            <BaseReport report={this.props.report}/>
        )
    }
}
