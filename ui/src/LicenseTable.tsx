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
import { Result, License, Severity } from './trivy';
import { ISimpleListCell } from 'azure-devops-ui/List';
import { ZeroData } from 'azure-devops-ui/ZeroData';
import { compareSeverity, renderSeverity } from './severity';
import { ITableColumn } from 'azure-devops-ui/Components/Table/Table.Props';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';

interface LicenseTableProps {
  results: Result[];
}

interface ListLicense extends ISimpleTableCell {
  Severity: ISimpleListCell;
  Category: ISimpleListCell;
  PkgName: ISimpleListCell;
  Name: ISimpleListCell;
  FilePath: ISimpleListCell;
  Confidence: ISimpleListCell;
  Link: ISimpleListCell;
}

function renderLicenseSeverity(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<ListLicense>,
  tableItem: ListLicense
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
    id: 'Severity',
    name: 'Severity',
    readonly: true,
    renderCell: renderLicenseSeverity,
    width: 120,
    sortProps: {
      ariaLabelAscending: 'Sorted by severity ascending',
      ariaLabelDescending: 'Sorted by severity descending',
    },
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Category',
    name: 'Category',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-10),
    sortProps: {
      ariaLabelAscending: 'Sorted A to Z',
      ariaLabelDescending: 'Sorted Z to A',
    },
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'PkgName',
    name: 'PkgName',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-10),
    sortProps: {
      ariaLabelAscending: 'Sorted A to Z',
      ariaLabelDescending: 'Sorted Z to A',
    },
  },
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Name',
    name: 'License',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-20),
    sortProps: {
      ariaLabelAscending: 'Sorted A to Z',
      ariaLabelDescending: 'Sorted Z to A',
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
  {
    columnLayout: TableColumnLayout.singleLine,
    id: 'Link',
    name: 'Link',
    readonly: true,
    renderCell: renderSimpleCell,
    width: new ObservableValue(-25),
  },
];

const sortFunctions = [
  (item1: ListLicense, item2: ListLicense): number => {
    const severity1: ISimpleListCell = item1.Severity;
    const severity2: ISimpleListCell = item2.Severity;
    return compareSeverity(severity1.text, severity2.text);
  },
  (item1: ListLicense, item2: ListLicense): number => {
    const value1: ISimpleListCell = item1.Category;
    const value2: ISimpleListCell = item2.Category;
    return value1.text?.localeCompare(value2.text ?? '') || 0;
  },
  (item1: ListLicense, item2: ListLicense): number => {
    const value1: ISimpleListCell = item1.PkgName;
    const value2: ISimpleListCell = item2.PkgName;
    return value1.text?.localeCompare(value2.text ?? '') || 0;
  },
  null,
  (item1: ListLicense, item2: ListLicense): number => {
    const value1: ISimpleListCell = item1.FilePath;
    const value2: ISimpleListCell = item2.FilePath;
    return value1.text?.localeCompare(value2.text ?? '') || 0;
  },
  null,
];

export class LicensesTable extends React.Component<LicenseTableProps> {
  private readonly results: ObservableArray<ListLicense> =
    new ObservableArray<ListLicense>([]);

  constructor(props: LicenseTableProps) {
    super(props);
    this.results = new ObservableArray<ListLicense>(
      convertLicenses(props.results)
    );
    // sort by severity desc by default
    this.results.splice(
      0,
      this.results.length,
      ...sortItems<ListLicense>(
        0,
        SortOrder.descending,
        sortFunctions,
        fixedColumns,
        this.results.value
      )
    );
  }

  render() {
    const sortingBehavior = new ColumnSorting<ListLicense>(
      (columnIndex: number, proposedSortOrder: SortOrder) => {
        this.results.splice(
          0,
          this.results.length,
          ...sortItems<ListLicense>(
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
          <span>No licenses were found for this scan target.</span>
        }
        imageAltText="trivy"
        imagePath={'images/trivy.png'}
      />
    ) : (
      <Table
        pageSize={this.results.length}
        selectableText={true}
        ariaLabel="Licenses Table"
        role="table"
        behaviors={[sortingBehavior]}
        columns={fixedColumns}
        itemProvider={new ArrayItemProvider(this.results.value)}
        containerClassName="h-scroll-auto"
      />
    );
  }
}

function convertLicenses(results: Result[]): ListLicense[] {
  const output: ListLicense[] = [];
  results.forEach((result) => {
    if (
      Object.prototype.hasOwnProperty.call(result, 'Licenses') &&
      result.Licenses !== null
    ) {
      const target = result.Target;
      result.Licenses.forEach(function (license: License) {
        output.push({
          Severity: { text: license.Severity },
          Category: {
            text: license.Category,
          },
          PkgName: { text: license.PkgName },
          Name: { text: license.Name },
          FilePath: { text: license.FilePath || target },
          Confidence: { text: license.Confidence.toString() },
          Link: { text: license.Link },
        });
      });
    }
  });
  return output;
}
