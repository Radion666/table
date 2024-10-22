import { TotalCellRenderer } from "../timesheet/components/total-cell-renderer/total-cell-renderer";
import { TotalHeaderRenderer } from "../timesheet/components/total-header-renderer/total-header-renderer";
import { headerType } from "../timesheet/timesheet";

export const defaultHeaders: headerType[] = [
  {
    label: "Работник",
    value: (obj) => `${obj.fullName} + ${obj.position}`,
    className: "min-w-48 flex-1 sticky left-0 bg-white z-40 ",
    fieldType: "text",
    type: "worker"
  },
  {
    label: "Местный (0) / неместный (1)",
    value: "local",
    className: "min-w-28 flex-1 sticky left-48 bg-white z-40 border-r-1 border-gray-500",
    fieldType: "text",
    type: "location"
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
    className: "min-w-[395px]",
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
