import * as React from 'react';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';

interface CrashProps {
  message: string;
}

export class Crash extends React.Component<CrashProps> {
  public props: CrashProps;

  constructor(props: CrashProps) {
    super(props);
    this.props = props;
  }

  render() {
    return (
      <MessageCard
        className="flex-self-stretch"
        severity={MessageCardSeverity.Error}
      >
        {this.props.message}
      </MessageCard>
    );
  }
}
