import * as React from 'react';
import {ObservableArray, ObservableValue} from "azure-devops-ui/Core/Observable";
import {
    ColumnSorting,
    ISimpleTableCell,
    renderSimpleCell,
    sortItems,
    SortOrder,
    Table,
    TableColumnLayout,
} from "azure-devops-ui/Table";
import {Result, Secret, Severity} from "./trivy";
import {ISimpleListCell} from "azure-devops-ui/List";
import {ZeroData} from "azure-devops-ui/ZeroData";
import {compareSeverity, renderSeverity} from "./severity";
import {ITableColumn} from "azure-devops-ui/Components/Table/Table.Props";

interface SecretsTableProps {
    results: Result[]
}

interface ListSecret extends ISimpleTableCell {
    Severity: ISimpleListCell,
    Category: ISimpleListCell
    RuleID: ISimpleListCell
    Title: ISimpleListCell
    Location: ISimpleListCell
    Match: ISimpleListCell
}

function renderSecretSeverity(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<ListSecret>, tableItem: ListSecret): JSX.Element {
    return renderSeverity(rowIndex, columnIndex, tableColumn, tableItem.Severity.text as Severity)
}

const fixedColumns = [
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Severity",
        name: "Severity",
        readonly: true,
        renderCell: renderSecretSeverity,
        width: 120,
        sortProps: {
            ariaLabelAscending: "Sorted by severity ascending",
            ariaLabelDescending: "Sorted by severity descending",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Category",
        name: "Category",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-10),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "RuleID",
        name: "Rule ID",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-10),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Title",
        name: "Title",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-20),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Location",
        name: "Location",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-35),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Match",
        name: "Match",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-25),
    },

];

const sortFunctions = [
    (item1: ListSecret, item2: ListSecret): number => {
        const severity1: ISimpleListCell = item1.Severity
        const severity2: ISimpleListCell = item2.Severity
        return compareSeverity(severity1.text, severity2.text);
    },
    (item1: ListSecret, item2: ListSecret): number => {
        const value1: ISimpleListCell = item1.Category
        const value2: ISimpleListCell = item2.Category
        return value1.text.localeCompare(value2.text);
    },
    (item1: ListSecret, item2: ListSecret): number => {
        const value1: ISimpleListCell = item1.RuleID
        const value2: ISimpleListCell = item2.RuleID
        return value1.text.localeCompare(value2.text);
    },
    null,
    (item1: ListSecret, item2: ListSecret): number => {
        const value1: ISimpleListCell = item1.Location
        const value2: ISimpleListCell = item2.Location
        return value1.text.localeCompare(value2.text);
    },
    null,
];

export class SecretsTable extends React.Component<SecretsTableProps> {
    private readonly results: ObservableArray<ListSecret>

    constructor(props: SecretsTableProps) {
        super(props)

        this.results = new ObservableArray<ListSecret>(convertSecrets(props.results))
        // sort by severity desc by default
        this.results.splice(
            0,
            this.results.length,
            ...sortItems<ListSecret>(
                0,
                SortOrder.descending,
                sortFunctions,
                fixedColumns,
                this.results.value,
            )
        )
    }

    componentDidUpdate(prevProps: Readonly<SecretsTableProps>, prevState, snapshot?: any): void {
        this.results.splice(
            0,
            this.results.length,
            ...sortItems<ListSecret>(
                0,
                SortOrder.descending,
                sortFunctions,
                fixedColumns,
                convertSecrets(this.props.results)
            ))
    }

    render() {
        const sortingBehavior = new ColumnSorting<ListSecret>(
            (
                columnIndex: number,
                proposedSortOrder: SortOrder,
            ) => {
                this.results.splice(
                    0,
                    this.results.length,
                    ...sortItems<ListSecret>(
                        columnIndex,
                        proposedSortOrder,
                        sortFunctions,
                        fixedColumns,
                        this.results.value,
                    )
                )
            }
        );

        return (
            this.results.length == 0 ?
                <ZeroData
                    primaryText="No problems found."
                    secondaryText={
                        <span>No secrets were found for this scan target.</span>
                    }
                    imageAltText="trivy"
                    imagePath={"images/trivy.png"}
                />
                :
                <Table
                    pageSize={this.results.length}
                    selectableText={true}
                    ariaLabel="Secrets Table"
                    role="table"
                    behaviors={[sortingBehavior]}
                    columns={fixedColumns}
                    itemProvider={this.results}
                    containerClassName="h-scroll-auto"
                />
        )
    }
}

function convertLocation(result: Result, secret: Secret): ISimpleListCell {
    let combined = result.Target + ":" + secret.StartLine
    if (secret.StartLine > secret.EndLine) {
        combined += "-" + secret.EndLine
    }
    return {
        text: combined,
    }
}

function convertSecrets(results: Result[]): ListSecret[] {
    const output: ListSecret[] = []
    results?.forEach(result => {
        if (Object.prototype.hasOwnProperty.call(result, "Secrets") && result.Secrets !== null) {
            result.Secrets.forEach(function (secret: Secret) {
                output.push({
                    Severity: { text: secret.Severity },
                    Category: {
                        text: secret.Category
                    },
                    RuleID: { text: secret.RuleID },
                    Title: { text: secret.Title },
                    Location: convertLocation(result, secret),
                    Match: { text: secret.Match },
                })
            })
        }
    })
    return output
}
