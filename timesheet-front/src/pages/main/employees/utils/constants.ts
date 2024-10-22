import { ActionsRenderer } from "../components/action-renderer";

import { GridColumnsType } from "~src/components/grid-table/grid-table";
import { usersEmployeeType } from "~src/shared/types/user";

export const employeesColumns: GridColumnsType<usersEmployeeType> = [
  {
    headerName: "ФИО",
    minWidth: 300,
    flex: 1,
    valueGetter: (employee) =>
      `${employee?.data?.lastName ?? ""} ${employee?.data?.firstName ?? ""} ${
        employee?.data?.middleName
      }`
  },
  {
    headerName: "Роль",
    valueGetter: (role) => `${role.data?.role?.alt_name ?? ""}`,
    minWidth: 300
  },
  {
    headerName: "Должность",
    valueGetter: (props) => `${props?.data?.position?.name ?? ""}`,
    minWidth: 300,
    flex: 1
  },
  {
    headerName: "Номер телефона",
    valueGetter: (props) => `${props?.data?.phoneNumber ?? ""}`,
    minWidth: 300,
    flex: 1
  },
  {
    headerName: "Действия",
    minWidth: 300,
    flex: 1,
    cellRenderer: ActionsRenderer
  }
];
