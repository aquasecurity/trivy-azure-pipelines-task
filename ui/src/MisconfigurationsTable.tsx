import * as React from 'react';
import {ObservableArray, ObservableValue} from "azure-devops-ui/Core/Observable";
import {
    ColumnSorting,
    ISimpleTableCell,
    renderSimpleCell,
    SimpleTableCell,
    sortItems,
    SortOrder,
    Table,
    TableColumnLayout,
} from "azure-devops-ui/Table";
import {Misconfiguration, Result, Severity} from "./trivy";
import {ISimpleListCell} from "azure-devops-ui/List";
import {ZeroData} from "azure-devops-ui/ZeroData";
import {compareSeverity, renderSeverity} from "./severity";
import {ITableColumn} from "azure-devops-ui/Components/Table/Table.Props";

interface MisconfigurationsTableProps {
    results: Result[]
}

interface ListMisconfiguration extends ISimpleTableCell {
    Severity: ISimpleListCell,
    ID: ISimpleListCell,
    Description: ISimpleListCell
    Location: ISimpleListCell
}

function renderMisconfigurationSeverity(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<ListMisconfiguration>, tableItem: ListMisconfiguration): JSX.Element {
    return renderSeverity(rowIndex, columnIndex, tableColumn, tableItem.Severity.text as Severity)
}

function renderLocation(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<ListMisconfiguration>, tableItem: ListMisconfiguration): JSX.Element {
    return <SimpleTableCell
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        key={"col-" + columnIndex}
    >
        <code key={"col-" + columnIndex}>{tableItem.Location.text}</code>
    </SimpleTableCell>
}

const fixedColumns = [
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Severity",
        name: "Severity",
        readonly: true,
        renderCell: renderMisconfigurationSeverity,
        width: 120,
        sortProps: {
            ariaLabelAscending: "Sorted by severity ascending",
            ariaLabelDescending: "Sorted by severity descending",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "ID",
        name: "ID",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-15),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Description",
        name: "Description",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-15),
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
        renderCell: renderLocation,
        width: new ObservableValue(-25),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
];

const sortFunctions = [
    (item1: ListMisconfiguration, item2: ListMisconfiguration): number => {
        const severity1: ISimpleListCell = item1.Severity
        const severity2: ISimpleListCell = item2.Severity
        return compareSeverity(severity1.text, severity2.text);
    },
    (item1: ListMisconfiguration, item2: ListMisconfiguration): number => {
        const value1: ISimpleListCell = item1.ID
        const value2: ISimpleListCell = item2.ID
        return value1.text.localeCompare(value2.text);
    },
    null,
    (item1: ListMisconfiguration, item2: ListMisconfiguration): number => {
        const value1: ISimpleListCell = item1.Location
        const value2: ISimpleListCell = item2.Location
        return value1.text.localeCompare(value2.text);
    },
];

export class MisconfigurationsTable extends React.Component<MisconfigurationsTableProps> {

    private readonly results: ObservableArray<ListMisconfiguration> = new ObservableArray<ListMisconfiguration>([])

    constructor(props: MisconfigurationsTableProps) {
        super(props)
        this.results = new ObservableArray<ListMisconfiguration>(convertMisconfigurations(props.results))
        // sort by severity desc by default
        this.results.splice(
            0,
            this.results.length,
            ...sortItems<ListMisconfiguration>(
                0,
                SortOrder.descending,
                sortFunctions,
                fixedColumns,
                this.results.value,
            )
        )
    }

    render() {

        const sortingBehavior = new ColumnSorting<ListMisconfiguration>(
            (
                columnIndex: number,
                proposedSortOrder: SortOrder,
            ) => {
                this.results.splice(
                    0,
                    this.results.length,
                    ...sortItems<ListMisconfiguration>(
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
                        <span>No misconfigurations were found for this scan target.</span>
                    }
                    imageAltText="trivy"
                    imagePath={"images/trivy.png"}
                />
                :
                <Table
                    pageSize={this.results.length}
                    selectableText={true}
                    ariaLabel="Misconfigurations Table"
                    role="table"
                    behaviors={[sortingBehavior]}
                    columns={fixedColumns}
                    itemProvider={this.results}
                    containerClassName="h-scroll-auto"
                />
        )
    }
}

function convertLocation(result: Result, misconfiguration: Misconfiguration): ISimpleListCell {
    let combined = result.Target + ":" + misconfiguration.CauseMetadata.StartLine
    if (misconfiguration.CauseMetadata.StartLine > misconfiguration.CauseMetadata.EndLine) {
        combined += "-" + misconfiguration.CauseMetadata.EndLine
    }
    return {
        text: combined,
        // TODO strip prefix?
//        text: combined.replace("/home/vsts/work/1/s/", "")
    }
}

function convertMisconfigurations(results: Result[]): ListMisconfiguration[] {
    const output: ListMisconfiguration[] = []
    results.forEach(result => {
        if (Object.prototype.hasOwnProperty.call(result, "Misconfigurations") && result.Misconfigurations !== null) {
            result.Misconfigurations.forEach(function (misconfiguration: Misconfiguration) {
                output.push({
                    Severity: {text: misconfiguration.Severity},
                    ID: {
                        text: misconfiguration.ID.toUpperCase(),
                        href: "https://avd.aquasec.com/misconfig/" + misconfiguration.ID.toLowerCase(),
                        hrefTarget: "_blank",
                        hrefRel: "noopener",
                        iconProps: {iconName: "NavigateExternalInline", ariaLabel: "External Link"}
                    },
                    Description: {text: misconfiguration.Description},
                    Location: convertLocation(result, misconfiguration),
                })
            })
        }
    })
    return output
}
