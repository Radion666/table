import { facilitiyType } from "./facilities";
import { EmployeeType, UserType } from "./user";

import { datesToBackType, dateToBackValueType } from "~src/pages/main/timesheet/data";

type valueType = datesToBackType;

export interface workLogsChangeResponseType {
  items: workLogsChangesType[];
  currentPage: number;
  totalPage: number;
  pageSize: number;
  totalItems: number;
}

export interface workLogsChangesType {
  id: number;
  workLogId: number;
  oldValue: valueType;
  newValue: valueType;
  changes: Record<
    string,
    {
      was: dateToBackValueType;
      became: dateToBackValueType;
    }
  >;
  facility: facilitiyType;
  user: UserType;
  employee: EmployeeType;

  date: string;
  createdAt: string;
}
