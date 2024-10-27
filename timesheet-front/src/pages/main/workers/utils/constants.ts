import dayjs from "dayjs";

import { ActionsRenderer } from "../components/actions-renderer";

import { GridColumnsType } from "~src/components/grid-table/grid-table";
import { actualWorkersResponseType, workerStatusType } from "~src/shared/types/employees";
import { getUserFio } from "~src/shared/utils/default";

const statuses: Record<workerStatusType, string> = {
  working: "Работает",
  archived: "В архиве",
  fired: "Уволен"
};

export const workersColumns: GridColumnsType<actualWorkersResponseType> = [
  {
    headerName: "ФИО",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => getUserFio(props?.data)
  },
  {
    headerName: "Статус",
    minWidth: 120,
    flex: 1,
    valueGetter: (props) => {
      const currentStatus = props?.data?.lastStatus;
      return currentStatus ? statuses[currentStatus] ?? "" : "";
    }
  },
  {
    headerName: "Создал",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => getUserFio(props?.data?.creator)
  },
  {
    headerName: "Мастер",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => getUserFio(props?.data?.lastMaster)
  },
  {
    headerName: "Номер телефона",
    minWidth: 150,
    flex: 1,
    field: "phoneNumber"
  },
  {
    headerName: "Местный или нет",
    minWidth: 170,
    flex: 1,
    valueGetter: (props) => {
      const isOutOfTown = props?.data?.lastIsOutOfTown;
      if (isOutOfTown === undefined) return "";
      return isOutOfTown ? "Иногородний" : "Местный";
    }
  },
  {
    headerName: "Должность",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      const position = props?.data?.lastPosition?.name;
      if (position === undefined) return "";
      return position;
    }
  },
  // {
  //   headerName: "Прописка по паспорту",
  //   minWidth: 200,
  //   flex: 1,
  //   valueGetter: (props) => {
  //     const registeredAddress = props?.data?.registeredAddress;
  //     if (registeredAddress === undefined) return "";
  //     return registeredAddress;
  //   }
  // },
  // {
  //   headerName: "Прописка фактическая",
  //   minWidth: 200,
  //   flex: 1,
  //   valueGetter: (props) => {
  //     const actualAddress = props?.data?.actualAddress;
  //     if (actualAddress === undefined) return "";
  //     return actualAddress;
  //   }
  // },
  {
    headerName: "Объект",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      const facility = props?.data?.lastFacility?.name;
      if (facility === undefined) return "";
      return facility;
    }
  },
  {
    headerName: "Дата создания",
    minWidth: 200,
    flex: 1,
    valueGetter: (props) => {
      const createdAt = props?.data?.createdAt;
      if (createdAt === undefined) return "";
      return dayjs(createdAt).format("DD.MM.YYYY HH:mm:ss");
    }
  },
  {
    headerName: "Действия",
    minWidth: 200,
    flex: 1,
    cellRenderer: ActionsRenderer
  }
];

export const workersStatuses = [
  {
    value: "archived",
    label: "В архиве"
  },
  {
    value: "working",
    label: "Работает"
  },
  {
    value: "fired",
    label: "Уволен"
  }
];

export { statuses as workerStatuses };
