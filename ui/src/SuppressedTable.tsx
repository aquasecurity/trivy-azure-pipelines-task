import * as React from 'react';
import {
  ObservableArray,
  ObservableValue,
} from 'azure-devops-ui/Core/Observable';
import {
  ColumnSorting,
  ISimpleTableCell,
  renderSimpleCell,
  sortItems,
  SortOrder,
  Table,
  TableColumnLayout,
} from 'azure-devops-ui/Table';
import {
  Report,
  Result,
  Severity,
  ExperimentalModifiedFindings,
} from './trivy';
import { ISimpleListCell } from 'azure-devops-ui/List';
import { ZeroData } from 'azure-devops-ui/ZeroData';
import { compareSeverity, renderSeverity } from './severity';
import { ITableColumn } from 'azure-devops-ui/Components/Table/Table.Props';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';

interface SuppressedTableProps {
  report: Report;
}

interface ListSuppressed extends ISimpleTableCell {
  Type: ISimpleTableCell;
  ID: ISimpleTableCell;
  Status: ISimpleTableCell;
  Statement: ISimpleTableCell;
  Source: ISimpleTableCell;
  Title: ISimpleTableCell;
  Severity: ISimpleListCell;
  FilePath: ISimpleListCell;
}

function renderSuppressedSeverity(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<ListSuppressed>,
  tableItem: ListSuppressed
): JSX.Element {
  return renderSeverity(
    rowIndex,
    columnIndex,
    tableColumn,
    tableItem.Severity.text as Severity
  );
}

const fixedColumns = [
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'ID',
    name: 'ID',
    readonly: true,
    renderCell: renderSimpleCell,
    width: 150,
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Type',
    name: 'Type',
    readonly: true,
    renderCell: renderSimpleCell,
    width: 150,
    sortProps: {
      ariaLabelAscending: 'Sorted A to Z',
      ariaLabelDescending: 'Sorted Z to A',
    },
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Status',
    name: 'Status',
    readonly: true,
    renderCell: renderSimpleCell,
    width: 100,
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Statement',
    name: 'Statement',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-20),
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Source',
    name: 'Source',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-8),
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Title',
    name: 'Title',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-20),
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Severity',
    name: 'Severity',
    readonly: true,
    renderCell: renderSuppressedSeverity,
    width: 120,
    sortProps: {
      ariaLabelAscending: 'Sorted by severity ascending',
      ariaLabelDescending: 'Sorted by severity descending',
    },
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'FilePath',
    name: 'Location',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-35),
    sortProps: {
      ariaLabelAscending: 'Sorted A to Z',
      ariaLabelDescending: 'Sorted Z to A',
    },
  },
];

const sortFunctions = [
  (item1: ListSuppressed, item2: ListSuppressed): number => {
    const severity1: ISimpleListCell = item1.Severity;
    const severity2: ISimpleListCell = item2.Severity;
    return compareSeverity(severity1.text, severity2.text);
  },
  (item1: ListSuppressed, item2: ListSuppressed): number => {
    const value1: ISimpleListCell = item1.Type;
    const value2: ISimpleListCell = item2.Type;
    return value1.text?.localeCompare(value2.text ?? '') || 0;
  },
  null,
  (item1: ListSuppressed, item2: ListSuppressed): number => {
    const value1: ISimpleListCell = item1.FilePath;
    const value2: ISimpleListCell = item2.FilePath;
    return value1.text?.localeCompare(value2.text ?? '') || 0;
  },
  null,
];

export class SuppressedTable extends React.Component<SuppressedTableProps> {
  private readonly results: ObservableArray<ListSuppressed> =
    new ObservableArray<ListSuppressed>([]);

  constructor(props: SuppressedTableProps) {
    super(props);
    this.results = new ObservableArray<ListSuppressed>(
      convertSuppressed(props.report.Results || [])
    );
    // sort by severity desc by default
    this.results.splice(
      0,
      this.results.length,
      ...sortItems<ListSuppressed>(
        0,
        SortOrder.descending,
        sortFunctions,
        fixedColumns,
        this.results.value
      )
    );
  }

  render() {
    const sortingBehavior = new ColumnSorting<ListSuppressed>(
      (columnIndex: number, proposedSortOrder: SortOrder) => {
        this.results.splice(
          0,
          this.results.length,
          ...sortItems<ListSuppressed>(
            columnIndex,
            proposedSortOrder,
            sortFunctions,
            fixedColumns,
            this.results.value
          )
        );
      }
    );

    return this.results.length == 0 ? (
      <ZeroData
        primaryText="No problems found."
        secondaryText={
          <span>No suppressions were found for this scan target.</span>
        }
        imageAltText="trivy"
        imagePath={'images/trivy.png'}
      />
    ) : (
      <Table
        pageSize={this.results.length}
        selectableText={true}
        ariaLabel="Suppressed Table"
        role="table"
        behaviors={[sortingBehavior]}
        columns={fixedColumns}
        itemProvider={new ArrayItemProvider(this.results.value)}
        containerClassName="h-scroll-auto"
      />
    );
  }
}

function convertSuppressed(results: Result[]): ListSuppressed[] {
  const output: ListSuppressed[] = [];
  results.forEach((result) => {
    if (
      Object.prototype.hasOwnProperty.call(
        result,
        'ExperimentalModifiedFindings'
      ) &&
      result.ExperimentalModifiedFindings !== null
    ) {
      const target = result.Target;
      result.ExperimentalModifiedFindings.forEach(function (
        suppressed: ExperimentalModifiedFindings
      ) {
        let id = '';
        if (suppressed.Finding.ID) {
          id = suppressed.Finding.ID;
        } else if (suppressed.Finding.VulnerabilityID) {
          id = suppressed.Finding.VulnerabilityID;
        }

        output.push({
          ID: { text: id },
          Type: {
            text: suppressed.Type.split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
          },
          Severity: { text: suppressed.Finding.Severity },
          Status: {
            text: suppressed.Status.split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
          },
          Statement: { text: suppressed.Statement },
          Source: { text: suppressed.Source },
          Title: { text: suppressed.Finding.Title },
          FilePath: { text: target },
        });
      });
    }
  });
  return output;
}
