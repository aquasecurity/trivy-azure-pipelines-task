import * as React from 'react';
import {
  AssuranceReport,
  countAssuranceIssues,
  countReportLicenses,
  countReportMisconfigurations,
  countReportSecrets,
  countReportSuppressed,
  countReportVulnerabilities,
  Report,
} from './trivy';
import { SecretsTable } from './SecretsTable';
import { VulnerabilitiesTable } from './VulnerabilitiesTable';
import { MisconfigurationsTable } from './MisconfigurationsTable';
import { LicensesTable } from './LicenseTable';
import { SuppressedTable } from './SuppressedTable';
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
  assuranceCount: number;
  suppressedCount: number;
  licensesCount: number;
  secretsCount: number;
  misconfigCount: number;
  vulnCount: number;

  constructor(props: BaseReportProps) {
    super(props);
    this.props = props;

    this.vulnCount = countReportVulnerabilities(this.props.report);
    this.misconfigCount = countReportMisconfigurations(this.props.report);
    this.secretsCount = countReportSecrets(this.props.report);
    this.licensesCount = countReportLicenses(this.props.report);
    this.suppressedCount = countReportSuppressed(this.props.report);
    this.assuranceCount = countAssuranceIssues(this.props.assurance);

    this.state = {
      selectedTabId:
        this.vulnCount > 0
          ? 'vulnerabilities'
          : this.misconfigCount > 0
            ? 'misconfigurations'
            : this.secretsCount > 0
              ? 'secrets'
              : this.licensesCount > 0
                ? 'licenses'
                : this.suppressedCount > 0
                  ? 'suppressed'
                  : this.assuranceCount > 0
                    ? 'assurance'
                    : 'vulnerabilities',
    };
  }

  private onSelectedTabChanged = (newTabId: string) => {
    this.setState({ selectedTabId: newTabId });
  };

  render() {
    return (
      <div className="flex-grow">
        <div className="flex-grow">
          <TabBar
            onSelectedTabChanged={this.onSelectedTabChanged}
            selectedTabId={this.state.selectedTabId}
            tabSize={TabSize.Tall}
          >
            {this.vulnCount > 0 && (
              <Tab
                id="vulnerabilities"
                name="Vulnerabilities"
                key="vulnerabilities"
                badgeCount={this.vulnCount}
              />
            )}
            {this.misconfigCount > 0 && (
              <Tab
                id="misconfigurations"
                name="Misconfigurations"
                key="misconfigurations"
                badgeCount={this.misconfigCount}
              />
            )}
            {this.secretsCount > 0 && (
              <Tab
                id="secrets"
                name="Secrets"
                key="secrets"
                badgeCount={this.secretsCount}
              />
            )}
            {this.licensesCount > 0 && (
              <Tab
                id="licenses"
                name="Licenses"
                key="licenses"
                badgeCount={this.licensesCount}
              />
            )}
            {this.suppressedCount > 0 && (
              <Tab
                id="suppressed"
                name="Suppressed"
                key="Suppressed"
                badgeCount={this.suppressedCount}
              />
            )}
            {this.assuranceCount > 0 && (
              <Tab
                id="assurance"
                name="Assurance Issues"
                key="assurance"
                badgeCount={this.assuranceCount}
              />
            )}
          </TabBar>
        </div>
        <div className="tab-content flex-row">
          {this.state.selectedTabId === 'vulnerabilities' && (
            <div className="flex-grow">
              <VulnerabilitiesTable
                key={this.props.report.DisplayName}
                report={this.props.report}
              />
            </div>
          )}
          {this.state.selectedTabId === 'misconfigurations' && (
            <div className="flex-grow">
              <MisconfigurationsTable
                key={this.props.report.DisplayName}
                report={this.props.report}
              />
            </div>
          )}
          {this.state.selectedTabId === 'secrets' && (
            <div className="flex-grow">
              <SecretsTable
                key={this.props.report.DisplayName}
                report={this.props.report}
              />
            </div>
          )}
          {this.state.selectedTabId === 'licenses' && (
            <div className="flex-grow">
              <LicensesTable
                key={this.props.report.DisplayName}
                report={this.props.report}
              />
            </div>
          )}
          {this.state.selectedTabId === 'suppressed' && (
            <div className="flex-grow">
              <SuppressedTable
                key={this.props.report.DisplayName}
                report={this.props.report}
              />
            </div>
          )}
          {this.state.selectedTabId === 'assurance' && (
            <div className="flex-grow">
              <AssuranceTable
                key={this.props.assurance?.Report.DisplayName}
                report={this.props.assurance}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}
