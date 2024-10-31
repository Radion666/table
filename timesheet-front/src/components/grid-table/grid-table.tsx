import { FC, useMemo } from "react";

import { ColDef, ColGroupDef, GridOptions } from "ag-grid-community";
import { AgGridReact, AgGridReactProps } from "ag-grid-react"; // React Data Grid Component

import "ag-grid-community/styles/ag-grid.css"; // Mandatory CSS required by the Data Grid
import "ag-grid-community/styles/ag-theme-quartz.css"; // Optional Theme applied to the Data Grid
import clsx from "clsx";

import { Loader } from "../loader/loader";

export type GridColumnsType<T> = (ColDef<T> | ColGroupDef<T>)[];

interface GridTableProps {
  rowData: any[];
  columns: GridColumnsType | null;
  gridProps?: Omit<AgGridReactProps, "gridOptions" | "rowData" | "columnDefs">;
  defaultColDefParams?: ColDef<any>;
  gridOptionsParams?: GridOptions<any>;
}

export const GridTable: FC<GridTableProps> = ({
  rowData,
  columns,
  gridProps,
  gridOptionsParams,
  defaultColDefParams
}) => {
  const gridOptions: GridOptions<any> = useMemo(() => {
    return {
      defaultColDef: {
        sortable: false,
        suppressFiltersToolPanel: true,
        suppressCellFlash: true,
        suppressHeaderMenuButton: true,
        ...defaultColDefParams
      },
      rowHeight: 45,
      rowBuffer: 10,
      headerHeight: 45,
      groupHeaderHeight: 32,
      suppressCellFocus: true,
      suppressRowVirtualisation: false,
      suppressColumnVirtualisation: false,
      suppressHeaderFocus: true,
      suppressMovableColumns: true,
      suppressScrollOnNewData: true,
      enableCellTextSelection: true,
      overlayNoRowsTemplate: "Нет данных",
      rowSelection: undefined,
      rowMultiSelectWithClick: false,
      animateRows: false,
      loadingOverlayComponent: Loader,
      ...gridOptionsParams
    };
  }, [defaultColDefParams, gridOptionsParams]);

  return (
    <div className={clsx("ag-theme-quartz", "flex-1")}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columns}
        gridOptions={gridOptions as any}
        {...gridProps}
      />
    </div>
  );
};
