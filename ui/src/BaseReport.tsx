import * as React from 'react';
import {
  AssuranceReport,
  countReportMisconfigurations,
  countReportSecrets,
  countReportVulnerabilities,
  Report,
} from './trivy';
import { SecretsTable } from './SecretsTable';
import { VulnerabilitiesTable } from './VulnerabilitiesTable';
import { MisconfigurationsTable } from './MisconfigurationsTable';
import { Tab, TabBar, TabSize } from 'azure-devops-ui/Tabs';
import { AssuranceTable } from './AssuranceTable';

interface BaseReportProps {
  report: Report;
  assurance: AssuranceReport | undefined;
}

interface BaseReportState {
  selectedTabId: string;
}

export class BaseReport extends React.Component<
  BaseReportProps,
  BaseReportState
> {
  public props: BaseReportProps;

  constructor(props: BaseReportProps) {
    super(props);
    this.props = props;
    this.state = {
      selectedTabId: 'vulnerabilities',
    };
  }

  private onSelectedTabChanged = (newTabId: string) => {
    this.setState({ selectedTabId: newTabId });
  };

  private countAssuranceIssues(assurance: AssuranceReport): number {
    if (this.props.assurance === undefined) {
      return 0;
    }
    if (!Object.prototype.hasOwnProperty.call(assurance, 'Results')) {
      return 0;
    }
    let total = 0;
    assurance.Results?.forEach((result) => {
      result.PolicyResults?.forEach((policyResult) => {
        if (Object.prototype.hasOwnProperty.call(policyResult, 'Failed')) {
          total++;
        }
      });
    });
    return total;
  }

  render() {
    return (
      <div className="flex-grow">
        <div className="flex-grow">
          <TabBar
            onSelectedTabChanged={this.onSelectedTabChanged}
            selectedTabId={this.state.selectedTabId}
            tabSize={TabSize.Tall}
          >
            <Tab
              id="vulnerabilities"
              name="Vulnerabilities"
              key="vulnerabilities"
              badgeCount={countReportVulnerabilities(this.props.report)}
            />
            <Tab
              id="misconfigurations"
              name="Misconfigurations"
              key="misconfigurations"
              badgeCount={countReportMisconfigurations(this.props.report)}
            />
            <Tab
              id="secrets"
              name="Secrets"
              key="secrets"
              badgeCount={countReportSecrets(this.props.report)}
            />
            {this.props.assurance !== undefined && (
              <Tab
                id="assurance"
                name="Assurance Issues"
                key="assurance"
                badgeCount={this.countAssuranceIssues(this.props.assurance)}
              />
            )}
          </TabBar>
        </div>
        <div className="tab-content flex-row">
          {this.state.selectedTabId === 'vulnerabilities' && (
            <div className="flex-grow">
              <VulnerabilitiesTable results={this.props.report.Results} />
            </div>
          )}
          {this.state.selectedTabId === 'misconfigurations' && (
            <div className="flex-grow">
              <MisconfigurationsTable results={this.props.report.Results} />
            </div>
          )}
          {this.state.selectedTabId === 'secrets' && (
            <div className="flex-grow">
              <SecretsTable results={this.props.report.Results} />
            </div>
          )}
          {this.state.selectedTabId === 'assurance' && (
            <div className="flex-grow">
              <AssuranceTable results={this.props.assurance?.Results || []} />
            </div>
          )}
        </div>
      </div>
    );
  }
}
