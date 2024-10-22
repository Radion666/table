import { ActionsRenderer } from "../components/actions-renderer";

import { GridColumnsType } from "~src/components/grid-table/grid-table";
import { facilitiyType } from "~src/shared/types/facilities";
import { getShortUserFio } from "~src/shared/utils/default";

export const facilitiesColumns: GridColumnsType<facilitiyType> = [
  {
    headerName: "ID объекта",
    field: "id",
    minWidth: 300,
    flex: 1
  },
  {
    headerName: "Наименование",
    field: "name",
    minWidth: 300,
    flex: 1
  },
  {
    headerName: "Мастера",
    minWidth: 300,
    valueGetter: (data) => {
      const masters = data?.data?.masterFactories;
      if (masters?.length) {
        return masters?.map((master) => `${getShortUserFio(master.master)}`);
      }
      return "";
    }
  },
  {
    headerName: "Редактирование",
    minWidth: 300,
    flex: 1,
    cellRenderer: ActionsRenderer
  }
];
