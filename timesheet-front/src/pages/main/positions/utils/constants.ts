import { ActionsRenderer } from "../components/actions-renderer";

import { GridColumnsType } from "~src/components/grid-table/grid-table";
import { positionType } from "~src/shared/types/positions";

export const positionsColumns: GridColumnsType<positionType> = [
  {
    headerName: "ID должности",
    field: "id",
    minWidth: 200,
    flex: 1
  },
  {
    headerName: "Наименование должности",
    field: "name",
    minWidth: 200,
    flex: 1
  },
  {
    headerName: "Объекты",
    field: "name",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      const data = props?.data?.facilities;
      return data?.map((el) => el.name).join(", ") || "";
    }
  },
  {
    headerName: "Действия",
    minWidth: 200,
    flex: 1,
    cellRenderer: ActionsRenderer
  }
];
