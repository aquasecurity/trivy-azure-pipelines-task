import React from 'react';
import { ObservableValue } from 'azure-devops-ui/Core/Observable';
import './css/styles.css';
import { Button } from 'azure-devops-ui/Button';
import { Dropdown } from 'azure-devops-ui/Dropdown';
import { Report } from './trivy';

interface ReportDownloadProps {
  report: Report;
}

export class ReportDownload extends React.Component<ReportDownloadProps> {
  public props: ReportDownloadProps;

  constructor(props: ReportDownloadProps) {
    super(props);

    this.props = props;
  }

  private selectedItem = new ObservableValue<string>('');

  openReport = () => {
    if (this.selectedItem.value) {
      window.open(this.selectedItem.value, '_blank');
    }
  };

  render() {
    return (
      this.props.report.DownloadReports.length > 0 && (
        <div className="flex-grow flex-row justify-end">
          <Dropdown
            ariaLabel="Select Report"
            placeholder="Select a report to download"
            items={this.props.report.DownloadReports.map((r) => {
              return {
                id: r.Url,
                text: r.Name,
                iconProps: { iconName: 'Download' },
              };
            })}
            onSelect={(event, item) => {
              this.selectedItem.value = item.id;
            }}
            showChecksColumn={false}
            className="dropdown"
          />
          <Button
            className="button"
            text="Download"
            onClick={this.openReport}
          />
        </div>
      )
    );
  }
}
