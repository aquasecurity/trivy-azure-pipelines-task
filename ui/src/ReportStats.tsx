import * as React from 'react';
import {
    countReportIssues,
    countReportMisconfigurations,
    countReportSecrets,
    countReportVulnerabilities,
    Report
} from './trivy';
import {Card} from "azure-devops-ui/Card";

interface ReportStatsProps {
    report: Report
}

export class ReportStats extends React.Component<ReportStatsProps> {

    public props: ReportStatsProps

    constructor(props: ReportStatsProps) {
        super(props)
        this.props = props
    }

    render() {
        const stats = [
            {
                name: "Type",
                value: this.props.report.ArtifactType,
            },
            {
                name: "Target",
                value: this.props.report.ArtifactName,
            },
            {
                name: "Total Issues",
                value: countReportIssues(this.props.report)
            },
            {
                name: "Vulnerabilities",
                value: countReportVulnerabilities(this.props.report)
            },
            {
                name: "Misconfigurations",
                value: countReportMisconfigurations(this.props.report)
            },
            {
                name: "Secrets",
                value: countReportSecrets(this.props.report)
            }
        ]
        return (
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
        )
    }
}
