import dayjs from "dayjs";

import { CellRenderer } from "../components/cell-renderer/cell-renderer";

import { GridColumnsType } from "~src/components/grid-table/grid-table";
import { workLogsChangesType } from "~src/shared/types/logs";
import { getShortUserFio } from "~src/shared/utils/default";

export const workLogLogsColumns: GridColumnsType<workLogsChangesType> = [
  {
    headerName: "Объект",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      const data = props?.data?.facility?.name;
      return data ?? "";
    }
  },
  {
    headerName: "Сотрудник",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      const data = getShortUserFio(props?.data?.employee);
      return data ?? "";
    }
  },
  {
    headerName: "Изменен",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      const data = getShortUserFio(props?.data?.user);
      return data ?? "";
    }
  },
  {
    headerName: "Дата табеля (месяц-год)",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      return props?.data?.date ?? "";
    }
  },
  {
    headerName: "Изменения",
    minWidth: 200,
    flex: 1,
    cellRenderer: CellRenderer
  },
  {
    headerName: "Дата изменения",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      return dayjs(props?.data?.createdAt)?.format("DD.MM.YYYY HH:mm:ss") ?? "";
    }
  }
];
