import * as React from 'react';
import {BuildStatus} from "azure-devops-extension-api/Build";
import {Spinner, SpinnerSize} from "azure-devops-ui/Spinner";

interface LoadingProps {
    status: BuildStatus
}

export class Loading extends React.Component<LoadingProps> {

    public props: LoadingProps

    constructor(props: LoadingProps) {
        super(props)
        this.props = props
    }

    getMessage(): string {
        switch (this.props.status) {
            case BuildStatus.None:
                return "Initialising..."
            case BuildStatus.Cancelling:
                return "Cancelling build..."
            case BuildStatus.InProgress:
                return "Waiting for build to complete..."
            case BuildStatus.NotStarted:
                return "Waiting for build to start..."
            case BuildStatus.Postponed:
                return "Build postponed, waiting..."
        }
        return "Loading..."
    }

    render() {
        return (
            <div className="flex-center">
                <Spinner label={this.getMessage()} size={SpinnerSize.large}/>
            </div>
        )
    }
}
