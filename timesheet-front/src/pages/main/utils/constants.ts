import { TotalCellRenderer } from "../timesheet/components/total-cell-renderer/total-cell-renderer";
import { TotalHeaderRenderer } from "../timesheet/components/total-header-renderer/total-header-renderer";
import { headerType } from "../timesheet/timesheet";

import { TableLocationHeader } from "./../timesheet/components/table-location-header/table-location-header";

export const defaultHeaders: headerType[] = [
  {
    label: "Работник",
    value: (obj) => `${obj.fullName} + ${obj.lastPosition?.name}`,
    // value: () => <TableEmployeeRenderer />,

    className: "md:!min-w-48 !min-w-20 flex-1 sticky left-0 bg-white z-40 ",
    fieldType: "employee",
    type: "worker"
  },
  {
    label: TableLocationHeader,
    className:
      "min-w-12 flex-1 sticky md:left-48 left-20 bg-white z-40 border-r-1 border-gray-500 max-w-12",
    fieldType: "text",
    type: "location",
    value: (obj) => String(obj.lastIsOutOfTown ? 1 : 0)
  },
  {
    label: "",
    value: "info",
    fieldType: "info",
    type: "info"
  },
  {
    label: "Итого",
    value: "total_of_all",
    fieldType: "text",
    renderer: TotalHeaderRenderer,
    cellRenderer: TotalCellRenderer,
    className: "!min-w-[295px]",
    type: "total"
  }
  // {
  //   label: "Итого смен",
  //   value: "total_of_smena",
  //   fieldType: "input"
  // },
  // {
  //   label: "Итого часов (вых)",
  //   value: "total_of_weekend_hours",
  //   fieldType: "input"
  // },
  // {
  //   label: "Итого смен (вых)",
  //   value: "total_of_count_of_weekend",
  //   fieldType: "input"
  // }
];
