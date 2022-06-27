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
import {AssuranceResult, PolicyResult} from "./trivy";
import {ISimpleListCell} from "azure-devops-ui/List";
import {ZeroData} from "azure-devops-ui/ZeroData";
import {compareSeverity} from "./severity";

interface AssuranceTableProps {
    results: AssuranceResult[]
}

interface ListAssurance extends ISimpleTableCell {
    Policy: ISimpleListCell,
    AVDID: ISimpleListCell, // with link
    Enforced: ISimpleListCell
    Title: ISimpleListCell
}

const fixedColumns = [
    {
        columnLayout: TableColumnLayout.singleLine,
        id: "Policy",
        name: "Policy",
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
        id: "AVDID",
        name: "ID",
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
        id: "Enforced",
        name: "Enforced",
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
        width: new ObservableValue(-50),
    },
];

const sortFunctions = [
    (item1: ListAssurance, item2: ListAssurance): number => {
        const value1: ISimpleListCell = item1.Policy
        const value2: ISimpleListCell = item2.Policy
        return compareSeverity(value1.text, value2.text);
    },
    (item1: ListAssurance, item2: ListAssurance): number => {
        const value1: ISimpleListCell = item1.AVDID
        const value2: ISimpleListCell = item2.AVDID
        return value1.text.localeCompare(value2.text);
    },
    (item1: ListAssurance, item2: ListAssurance): number => {
        const value1: ISimpleListCell = item1.Enforced
        const value2: ISimpleListCell = item2.Enforced
        return value1.text.localeCompare(value2.text);
    },
    null,
];

export class AssuranceTable extends React.Component<AssuranceTableProps> {

    private readonly results: ObservableArray<ListAssurance> = new ObservableArray<ListAssurance>([])

    constructor(props: AssuranceTableProps) {
        super(props)
        this.results = new ObservableArray<ListAssurance>(convertAssuranceIssues(props.results))
        // sort by severity desc by default
        this.results.splice(
            0,
            this.results.length,
            ...sortItems<ListAssurance>(
                0,
                SortOrder.descending,
                sortFunctions,
                fixedColumns,
                this.results.value,
            )
        )
    }

    render() {

        const sortingBehavior = new ColumnSorting<ListAssurance>(
            (
                columnIndex: number,
                proposedSortOrder: SortOrder,
            ) => {
                this.results.splice(
                    0,
                    this.results.length,
                    ...sortItems<ListAssurance>(
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
                        <span>No assurance issues were found for this scan target.</span>
                    }
                    imageAltText="trivy"
                    imagePath={"images/trivy.png"}
                />
                :
                <React.Fragment>
                    <p>Your repository failed the following assurance policy checks.</p>
                    <Table
                        pageSize={this.results.length}
                        selectableText={true}
                        ariaLabel="Assurance Issues Table"
                        role="table"
                        behaviors={[sortingBehavior]}
                        columns={fixedColumns}
                        itemProvider={this.results}
                        containerClassName="h-scroll-auto"
                    />
                </React.Fragment>
        )
    }
}

function convertAssuranceIssues(results: AssuranceResult[]): ListAssurance[] {
    const output: ListAssurance[] = []
    results.forEach(result => {
        result.PolicyResults.forEach(function (policyResult: PolicyResult) {
            if (!Object.prototype.hasOwnProperty.call(policyResult, "Failed") || !policyResult.Failed) {
                return
            }
            output.push({
                Policy: {text: Object.prototype.hasOwnProperty.call(policyResult, "PolicyID") ? policyResult.PolicyID : ""},
                Enforced: {text: Object.prototype.hasOwnProperty.call(policyResult, "Enforced") ? (policyResult.Enforced ? "Yes" : "No") : "No"},
                AVDID: {text: result.AVDID},
                Title: {text: result.Title},
            })
        })
    })
    return output
}
