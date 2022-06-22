import {IColor} from "azure-devops-ui/Utilities/Color";
import {ITableColumn} from "azure-devops-ui/Components/Table/Table.Props";
import {SimpleTableCell} from "azure-devops-ui/Table";
import {PillGroup} from "azure-devops-ui/PillGroup";
import {Pill, PillSize, PillVariant} from "azure-devops-ui/Pill";
import {Severity} from "./trivy";
import * as React from "react";

const severityColours: IColor[] = [
    {red: 0x42, green: 0x89, blue: 0x59},
    {red: 0x2a, green: 0x4f, blue: 0x87},
    {red: 0xf1, green: 0x8f, blue: 0x01},
    {red: 0xc7, green: 0x3e, blue: 0x1d},
    {red: 0x3b, green: 0x1f, blue: 0x2b},
]

function getSeverityColour(s: string): IColor {
    return severityColours[severityToInt(s)]
}

export function renderSeverity<T>(rowIndex: number, columnIndex: number, tableColumn: ITableColumn<T>, severity: Severity): JSX.Element {
    return <SimpleTableCell
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        key={"col-" + columnIndex}
        contentClassName="fontWeightSemiBold font-weight-semibold fontSizeM font-size-m scroll-hidden"
    >
        <PillGroup className="flex-row severity-pill-group">
            <Pill
                color={getSeverityColour(severity)}
                size={PillSize.regular}
                variant={PillVariant.colored}
                contentClassName={"severity-pill-content"}
            >
                {severity}
            </Pill>
        </PillGroup>
    </SimpleTableCell>
}

function severityToInt(s: string): number {
    switch (s) {
        case "CRITICAL":
            return 4
        case "HIGH":
            return 3
        case "MEDIUM":
            return 2
        case "LOW":
            return 1
        default:
            return 0
    }
}

export function compareSeverity(a: string, b: string): number {
    return severityToInt(a) - severityToInt(b)
}