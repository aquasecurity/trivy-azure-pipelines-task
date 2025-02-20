import * as React from 'react';
import {
  ArtifactType,
  countAllReportsIssues,
  countAllReportsMisconfigurations,
  countAllReportsSecrets,
  countAllReportsVulnerabilities,
  countReportIssues,
  Report,
  getReportTitle,
  AssuranceReport,
  countAllReportLicenses,
} from './trivy';
import { ImageReport } from './ImageReport';
import { FilesystemReport } from './FilesystemReport';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';
import { Card } from 'azure-devops-ui/Card';
import { Dropdown } from 'azure-devops-ui/Dropdown';
import { DropdownSelection } from 'azure-devops-ui/Utilities/DropdownSelection';
import './css/styles.css';

interface ReportsPaneProps {
  reports: Report[];
  assuranceReports: AssuranceReport[];
}

interface ReportsPaneState {
  selectedTabId: string;
}

export class ReportsPane extends React.Component<
  ReportsPaneProps,
  ReportsPaneState
> {
  public props: ReportsPaneProps;
  public state: ReportsPaneState;

  selection = new DropdownSelection();

  constructor(props: ReportsPaneProps) {
    super(props);
    if (props.reports === null) {
      props.reports = [];
    }
    if (props.assuranceReports === null) {
      props.assuranceReports = [];
    }
    this.props = props;
    this.state = {
      selectedTabId: '0',
    };

    this.selection.select(0);
  }

  private onSelectionChanged = (newTabId: string) => {
    this.setState({ selectedTabId: newTabId });
  };

  private getReport(): Report {
    return this.props.reports[parseInt(this.state.selectedTabId)];
  }

  private getAssuranceReport(): AssuranceReport | undefined {
    const report = this.getReport();
    if (report === null) {
      return undefined;
    }
    let assuranceReport: AssuranceReport | undefined = undefined;
    this.props.assuranceReports.forEach((match) => {
      if (
        report.ArtifactType == match.Report.ArtifactType &&
        report.ArtifactName == match.Report.ArtifactName
      ) {
        assuranceReport = match;
      }
    });
    return assuranceReport;
  }

  private sortReports() {
    // sort the reports for consistency
    this.props.reports.sort((a, b) => {
      if (a.ArtifactType < b.ArtifactType) {
        return -1;
      }
      if (a.ArtifactType > b.ArtifactType) {
        return 1;
      }
      if (a.ArtifactName < b.ArtifactName) {
        return -1;
      }
      if (a.ArtifactName > b.ArtifactName) {
        return 1;
      }
      return 0;
    });
  }

  render() {
    this.sortReports();
    const stats = [
      {
        name: 'Total Scans',
        value: this.props.reports.length,
      },
      {
        name: 'Total Issues',
        value: countAllReportsIssues(this.props.reports),
      },
      {
        name: 'Vulnerabilities',
        value: countAllReportsVulnerabilities(this.props.reports),
      },
      {
        name: 'Misconfigurations',
        value: countAllReportsMisconfigurations(this.props.reports),
      },
      {
        name: 'Secrets',
        value: countAllReportsSecrets(this.props.reports),
      },
      {
        name: 'Licenses',
        value: countAllReportLicenses(this.props.reports),
      },
    ];
    return (
      <div className="flex-column">
        {this.props.reports.length === 0 ? (
          <MessageCard
            className="flex-self-stretch"
            severity={MessageCardSeverity.Info}
          >
            No reports found for this build. Add Trivy to your pipeline
            configuration or check the build logs for more information.
          </MessageCard>
        ) : (
          <div className="flex-grow">
            <div className="flex-row" style={{ paddingBottom: 100 }}>
              <Card className="flex-grow">
                <div className="flex-row" style={{ flexWrap: 'wrap' }}>
                  {stats.map((items, index) => (
                    <div className="flex-column statistic-item" key={index}>
                      <div className="body-m primary-text">{items.name}</div>
                      <div className="body-m secondary-text statistic-count">
                        {items.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="flex-row">
              <span className="task-label">Select a job:</span>
              <Dropdown
                className="task-dropdown"
                selection={this.selection}
                ariaLabel="Select Report"
                onSelect={(event, item) => {
                  if (item.id) {
                    this.setState({ selectedTabId: item.id });
                    this.onSelectionChanged(item.id);
                  }
                }}
                items={this.props.reports.map((r, index) => {
                  return {
                    id: index + '',
                    text: `${getReportTitle(r)} (${countReportIssues(r)})`,
                  };
                })}
              />
            </div>
            <div className="flex-grow">
              <div className="tab-content">
                {this.getReport().ArtifactType == ArtifactType.Image ? (
                  <ImageReport
                    report={this.getReport()}
                    assurance={this.getAssuranceReport()}
                  />
                ) : (
                  <FilesystemReport
                    report={this.getReport()}
                    assurance={this.getAssuranceReport()}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
