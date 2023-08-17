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
import {Result, Severity, Vulnerability} from "./trivy";
import {ISimpleListCell} from "azure-devops-ui/List";
import {ZeroData} from "azure-devops-ui/ZeroData";
import {compareSeverity, renderSeverity} from "./severity";
import {ITableColumn} from "azure-devops-ui/Components/Table/Table.Props";

interface VulnerabilitiesTableProps {
    results: Result[]
}

interface ListVulnerability extends ISimpleTableCell {
    Severity: ISimpleListCell,
    ID: ISimpleListCell, // with link
    PkgName: ISimpleListCell
    Title: ISimpleListCell
    FixAvailable: ISimpleListCell
}

function renderVulnerabilitySeverity(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<ListVulnerability>, tableItem: ListVulnerability): JSX.Element {
    return renderSeverity(rowIndex, columnIndex, tableColumn, tableItem.Severity.text as Severity)
}

const fixedColumns = [
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Severity",
        name: "Severity",
        readonly: true,
        renderCell: renderVulnerabilitySeverity,
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
        width: new ObservableValue(-10),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "PkgName",
        name: "Package",
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
        width: new ObservableValue(-60),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "FixAvailable",
        name: "Fix Available",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-5),
        sortProps: {
            ariaLabelAscending: "Sorted A to Z",
            ariaLabelDescending: "Sorted Z to A",
        },
    },
];

const sortFunctions = [
    (item1: ListVulnerability, item2: ListVulnerability): number => {
        const severity1: ISimpleListCell = item1.Severity
        const severity2: ISimpleListCell = item2.Severity
        return compareSeverity(severity1.text, severity2.text);
    },
    (item1: ListVulnerability, item2: ListVulnerability): number => {
        const value1: ISimpleListCell = item1.ID
        const value2: ISimpleListCell = item2.ID
        return value1.text.localeCompare(value2.text);
    },
    (item1: ListVulnerability, item2: ListVulnerability): number => {
        const value1: ISimpleListCell = item1.PkgName
        const value2: ISimpleListCell = item2.PkgName
        return value1.text.localeCompare(value2.text);
    },
    null,
    (item1: ListVulnerability, item2: ListVulnerability): number => {
        const value1: ISimpleListCell = item1.FixAvailable
        const value2: ISimpleListCell = item2.FixAvailable
        return value1.text.localeCompare(value2.text);
    },
];

export class VulnerabilitiesTable extends React.Component<VulnerabilitiesTableProps> {

    private readonly results: ObservableArray<ListVulnerability> = new ObservableArray<ListVulnerability>([])

    constructor(props: VulnerabilitiesTableProps) {
        super(props)
        this.results = new ObservableArray<ListVulnerability>(convertVulnerabilities(props.results))
        // sort by severity desc by default
        this.results.splice(
            0,
            this.results.length,
            ...sortItems<ListVulnerability>(
                0,
                SortOrder.descending,
                sortFunctions,
                fixedColumns,
                this.results.value,
            )
        )
    }

    render() {

        const sortingBehavior = new ColumnSorting<ListVulnerability>(
            (
                columnIndex: number,
                proposedSortOrder: SortOrder,
            ) => {
                this.results.splice(
                    0,
                    this.results.length,
                    ...sortItems<ListVulnerability>(
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
                        <span>No vulnerabilities were found for this scan target.</span>
                    }
                    imageAltText="trivy"
                    imagePath={"images/trivy.png"}
                />
                :
                <Table
                    pageSize={this.results.length}
                    selectableText={true}
                    ariaLabel="Vulnerabilities Table"
                    role="table"
                    behaviors={[sortingBehavior]}
                    columns={fixedColumns}
                    itemProvider={this.results}
                    containerClassName="h-scroll-auto"
                />
        )
    }
}

function convertVulnerabilities(results?: Result[]): ListVulnerability[] {
    const output: ListVulnerability[] = []
    results?.forEach(result => {
        if (Object.prototype.hasOwnProperty.call(result, "Vulnerabilities") && result.Vulnerabilities !== null) {
            result.Vulnerabilities.forEach(function (vulnerability: Vulnerability) {
                output.push({
                    Severity: {text: vulnerability.Severity},
                    ID: {
                        text: vulnerability.VulnerabilityID,
                        href: vulnerability.PrimaryURL,
                        hrefTarget: "_blank",
                        hrefRel: "noopener",
                        iconProps: {iconName: "NavigateExternalInline", ariaLabel: "External Link"}
                    },
                    PkgName: {text: vulnerability.PkgName},
                    Title: {text: vulnerability.Title},
                    FixAvailable: {text: vulnerability.FixedVersion ? "Yes" : "No"},

                })
            })
        }
    })
    return output
}
