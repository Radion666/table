import { ActionsCellRenderer } from "../components/actions-renderer";

import { GridColumnsType } from "~src/components/grid-table/grid-table";
import { roleType } from "~src/shared/types/roles";

export const rolesColumns: GridColumnsType<roleType> = [
  {
    headerName: "ID роли",
    field: "id",
    minWidth: 200,
    flex: 1
  },
  {
    headerName: "Наименование роли на английском",
    field: "name",
    minWidth: 200,
    flex: 1
  },
  {
    headerName: "Наименование роли на русском",
    field: "alt_name",
    minWidth: 200,
    flex: 1
  },
  {
    headerName: "Редактирование наименования",
    field: "name",
    minWidth: 200,
    flex: 1,
    cellRenderer: ActionsCellRenderer
  }
];
