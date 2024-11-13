import { TotalCellRenderer } from "../timesheet/components/total-cell-renderer/total-cell-renderer";
import { TotalHeaderRenderer } from "../timesheet/components/total-header-renderer/total-header-renderer";
import { headerType } from "../timesheet/timesheet";

import { TableLocationHeader } from "./../timesheet/components/table-location-header/table-location-header";

export const defaultHeaders: headerType[] = [
  {
    label: "П.н.",
    value: (obj) => obj.fullName,
    fieldType: "index",
    type: "worker",
    className: "!min-w-8 flex-1 sticky left-0 bg-white z-40 overflow-hidden text-ellipsis text-sm"
  },
  {
    label: "Работник",
    value: (obj) => `${obj.fullName} + ${obj.lastPosition?.name}`,
    // value: () => <TableEmployeeRenderer />,

    className:
      "md:!min-w-48 !min-w-20 flex-1 sticky left-8 bg-white z-40 overflow-hidden text-ellipsis ",
    fieldType: "employee",
    type: "worker"
  },
  {
    fieldType: "position",
    label: "Должность",
    value: (obj) => obj.position,
    className:
      "md:!min-w-48 !min-w-20 flex-1 sticky md:left-56 left-28 bg-white z-40 overflow-hidden text-ellipsis ",
    type: "worker"
  },
  {
    label: TableLocationHeader,
    className:
      "min-w-12 flex-1 sticky md:left-[416px] left-28 bg-white z-40 border-r-1 border-gray-500 max-w-12 shadow-md",
    fieldType: "location",
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
    className: "!min-w-[295px] sticky right-0 bg-white z-40",
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
