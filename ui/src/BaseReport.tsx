import * as React from 'react';
import {
    countReportIssues,
    countReportMisconfigurations,
    countReportSecrets,
    countReportVulnerabilities,
    Report
} from './trivy';
import {SecretsTable} from "./SecretsTable";
import {ZeroData} from "azure-devops-ui/ZeroData";
import {VulnerabilitiesTable} from "./VulnerabilitiesTable";
import {MisconfigurationsTable} from "./MisconfigurationsTable";

interface BaseReportProps {
    report: Report
}

export class BaseReport extends React.Component<BaseReportProps> {

    public props: BaseReportProps

    constructor(props: BaseReportProps) {
        super(props)
        this.props = props
    }

    render() {
        return (
            countReportIssues(this.props.report) == 0 ?
                <ZeroData
                    primaryText="Build passed."
                    secondaryText={
                        <span>No problems were found within your project.</span>
                    }
                    imageAltText="trivy"
                    imagePath={"images/trivy.png"}
                /> :
                <div className="flex-column">
                    { countReportVulnerabilities(this.props.report) > 0 &&
                        <div className="flex-row">
                            <VulnerabilitiesTable results={this.props.report.Results}/>
                        </div>
                    }
                    { countReportMisconfigurations(this.props.report) > 0 &&
                        <div className="flex-row">
                            <MisconfigurationsTable results={this.props.report.Results}/>
                        </div>
                    }
                    { countReportSecrets(this.props.report) > 0 &&
                        <div className="flex-row">
                            <SecretsTable results={this.props.report.Results}/>
                        </div>
                    }
                </div>
        )
    }
}
