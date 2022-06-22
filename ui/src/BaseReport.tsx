import * as React from 'react';
import {countReportMisconfigurations, countReportSecrets, countReportVulnerabilities, Report} from './trivy';
import {SecretsTable} from "./SecretsTable";
import {VulnerabilitiesTable} from "./VulnerabilitiesTable";
import {MisconfigurationsTable} from "./MisconfigurationsTable";
import {Tab, TabBar, TabSize} from "azure-devops-ui/Tabs";

interface BaseReportProps {
    report: Report
}

interface BaseReportState {
    selectedTabId: string
}


export class BaseReport extends React.Component<BaseReportProps, BaseReportState> {

    public props: BaseReportProps

    constructor(props: BaseReportProps) {
        super(props)
        this.props = props
        this.state = {
            selectedTabId: "vulnerabilities"
        }
    }

    private onSelectedTabChanged = (newTabId: string) => {
        this.setState({selectedTabId: newTabId});
    };

    render() {
        return (
            <div className="flex-grow">
                <div className="flex-row">
                    <TabBar
                        onSelectedTabChanged={this.onSelectedTabChanged}
                        selectedTabId={this.state.selectedTabId}
                        tabSize={TabSize.Tall}
                    >
                        <Tab id="vulnerabilities" name="Vulnerabilities" key="vulnerabilities"
                             badgeCount={countReportVulnerabilities(this.props.report)}/>
                        <Tab id="misconfigurations" name="Misconfigurations" key="misconfigurations"
                             badgeCount={countReportMisconfigurations(this.props.report)}/>
                        <Tab id="secrets" name="Secrets" key="secrets"
                             badgeCount={countReportSecrets(this.props.report)}/>
                    </TabBar>
                </div>
                <div className="tab-content">
                {
                    this.state.selectedTabId === "vulnerabilities" &&
                    <div className="flex-row">
                        <VulnerabilitiesTable results={this.props.report.Results}/>
                    </div>
                }
                {
                    this.state.selectedTabId === "misconfigurations" &&
                    <div className="flex-row">
                        <MisconfigurationsTable results={this.props.report.Results}/>
                    </div>
                }
                {
                    this.state.selectedTabId === "secrets" &&
                    <div className="flex-row">
                        <SecretsTable results={this.props.report.Results}/>
                    </div>
                }
                </div>
            </div>
        )
    }
}
