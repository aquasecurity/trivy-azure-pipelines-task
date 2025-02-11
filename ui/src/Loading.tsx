import * as React from 'react';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { TimelineRecordState } from 'azure-devops-extension-api/Build/Build';

interface LoadingProps {
  status: TimelineRecordState;
}

export class Loading extends React.Component<LoadingProps> {
  public props: LoadingProps;

  constructor(props: LoadingProps) {
    super(props);
    this.props = props;
  }

  getMessage(): string {
    switch (this.props.status) {
      case TimelineRecordState.Pending:
        return 'Loading...';
      case TimelineRecordState.InProgress:
        return 'Waiting for scan to complete...';
      case TimelineRecordState.Completed:
        return 'Scan complete!';
    }
    return 'Loading...';
  }

  render() {
    return (
      <div className="flex-center">
        <Spinner label={this.getMessage()} size={SpinnerSize.large} />
      </div>
    );
  }
}
