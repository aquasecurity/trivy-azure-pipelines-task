import { Card } from "azure-devops-ui/Card";
import { Checkbox } from "azure-devops-ui/Checkbox";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { Observer } from "azure-devops-ui/Observer";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import {
    DropdownSelection
} from "azure-devops-ui/Utilities/DropdownSelection";
import { FILTER_CHANGE_EVENT, Filter, FilterOperatorType } from "azure-devops-ui/Utilities/Filter";
import * as React from 'react';
import { FilesystemReport } from "./FilesystemReport";
import { ImageReport } from "./ImageReport";
import './ReportsPane.css';
import {
    ArtifactType,
    AssuranceReport,
    Report,
    Summary,
    SummaryEntry
} from './trivy';

interface ReportsPaneProps {
    summary: Summary
    getReport: (name: string) => Promise<Report | undefined>
    assuranceReports: AssuranceReport[]
}

interface ReportsPaneState {
    selectedTabId: string
    report?: Report
    sdkReady: boolean
}

interface FilterState {
    repository: string
    owner: string
    withIssues: boolean
}

export class ReportsPane extends React.Component<ReportsPaneProps, ReportsPaneState> {
    public props: ReportsPaneProps
    public state: ReportsPaneState

    private filter: Filter;
    private currentState = new ObservableValue({} as FilterState);
    private selectionOwner = new DropdownSelection();
    private onlyWithIssues = new ObservableValue<boolean>(false);

    constructor(props: ReportsPaneProps) {
        super(props)

        this.filter = new Filter();
        this.filter.setFilterItemState("owner", {
            value: "",
            operator: FilterOperatorType.and
        })
        this.filter.setFilterItemState("withIssues", {
            value: false,
            operator: FilterOperatorType.and
        })
        this.filter.subscribe(() => {
            const owner = this.filter.getState()["owner"]
            const repository = this.filter.getState()["repository"]
            const withIssues = this.filter.getState()["withIssues"]

            this.currentState.value = { repository: repository?.value, owner: owner?.value[0], withIssues: withIssues?.value }
        }, FILTER_CHANGE_EVENT)

        this.state = {
            selectedTabId: "",
            sdkReady: false,
        }
    }

    private onSelectedTabChanged = (newTabId: string) => {
        this.setState({ selectedTabId: newTabId })
        this.props.getReport(newTabId).then(report => {
            this.setState({ report: report })
        })
    };

    private getAssuranceReport(): AssuranceReport | undefined {
        if (this.state.report === null) {
            return undefined
        }
        let assuranceReport: AssuranceReport | undefined = undefined
        this.props.assuranceReports.forEach(match => {
            if (this.state.report!.ArtifactType == match.Report.ArtifactType && this.state.report!.ArtifactName == match.Report.ArtifactName) {
                assuranceReport = match
            }
        })
        return assuranceReport
    }

    componentDidMount(): void {
        if (this.props.summary.results.length > 0)
            this.setState({ selectedTabId: this.props.summary.results[0].repository })
    }

    render() {
        const stats = [
            {
                name: "Total Scans",
                value: this.props.summary.results?.length ?? 0
            },
            {
                name: "Total Issues",
                value: this.props.summary.results.reduce((previous, current) => previous += current.secretsCount, 0)
            },
            {
                name: "Vulnerabilities",
                value: 0
            },
            {
                name: "Misconfigurations",
                value: 0
            },
            {
                name: "Secrets",
                value: this.props.summary.results.reduce((previous, current) => previous += current.secretsCount, 0)
            }
        ]

        return (
            <div>
                <div className="flex-column">
                    {
                        this.props.summary.results?.length === 0 ?
                            <MessageCard
                                className="flex-self-stretch"
                                severity={MessageCardSeverity.Info}
                            >
                                No reports found for this build. Add Trivy to your pipeline configuration or check the build
                                logs for more information.
                            </MessageCard> :
                            <div className="flex-grow">
                                <div className="flex-row" style={{ paddingBottom: 40 }}>
                                    <Card className="flex-grow">
                                        <div className="flex-row" style={{ flexWrap: "wrap" }}>
                                            {stats.map((items, index) => (
                                                <div className="flex-column" style={{ minWidth: "120px" }} key={index}>
                                                    <div className="body-m secondary-text">{items.name}</div>
                                                    <div className="body-m primary-text">{items.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                                <div className="flex-row" style={{ paddingBottom: 20 }}>
                                    <div className="flex-grow">
                                        <FilterBar filter={this.filter} onDismissClicked={() => this.onlyWithIssues.value = false}>
                                            <KeywordFilterBarItem filterItemKey="repository" placeholder="Repository name" />

                                            <Checkbox
                                                onChange={(_, checked) => {
                                                    this.onlyWithIssues.value = checked
                                                    this.filter.setFilterItemState("withIssues", {
                                                        value: checked,
                                                        operator: FilterOperatorType.and
                                                    })
                                                }}
                                                checked={this.onlyWithIssues}
                                                label="With Issues"
                                                className="faded-color"
                                            />
                                            <DropdownFilterBarItem
                                                filterItemKey="owner"
                                                filter={this.filter}
                                                items={this.props.summary.results
                                                    .reduce((acc: string[], current) => {
                                                        if (!acc.includes(current.owner) && current.owner !== "") {
                                                            acc.push(current.owner)
                                                        }
                                                        return acc
                                                    }, [])
                                                    .map(owner => ({
                                                        id: owner,
                                                        key: owner,
                                                        text: owner
                                                    }))
                                                }
                                                selection={this.selectionOwner}
                                                placeholder="Owner"
                                            />
                                        </FilterBar>
                                    </div>
                                </div>
                                <div className="flex-row" style={{ overflow: "auto" }}>
                                    <Observer currentState={this.currentState}>
                                        {(props: { currentState: FilterState }) => (
                                            <TabBar
                                                onSelectedTabChanged={this.onSelectedTabChanged}
                                                selectedTabId={this.state.selectedTabId}
                                                tabSize={TabSize.Tall}
                                            >
                                                {
                                                    this.props.summary.results
                                                        ?.filter((entry: SummaryEntry) => (
                                                            (props.currentState.repository?.length > 0 ? entry.repository.toLowerCase().includes(props.currentState.repository?.toLowerCase() ?? "") : true) &&
                                                            (props.currentState.owner?.length > 0 ? entry.owner.toLowerCase() === props.currentState.owner.toLowerCase() : true) &&
                                                            (props.currentState.withIssues ? entry.secretsCount > 0 : true)
                                                        ))
                                                        ?.sort((a, b) => a.secretsCount < b.secretsCount ? 1 : -1)
                                                        ?.map((entry: SummaryEntry, index: number) => (
                                                            <Tab
                                                                key={index}
                                                                id={`${entry.repository}`}
                                                                name={`${entry.repository}`}
                                                                badgeCount={entry.secretsCount} />
                                                        ))
                                                }
                                            </TabBar>
                                        )}
                                    </Observer>
                                </div>
                                <div className="flex-grow">
                                    <div className="tab-content">
                                        {
                                            this.state.report ?
                                                this.state.report.ArtifactType == ArtifactType.Image ?
                                                    <ImageReport report={this.state.report} assurance={this.getAssuranceReport()} /> :
                                                    <FilesystemReport report={this.state.report} assurance={this.getAssuranceReport()} />
                                                : <div></div>
                                        }
                                    </div>
                                </div>
                            </div >
                    }
                </div>
            </div>
        )
    }
}
