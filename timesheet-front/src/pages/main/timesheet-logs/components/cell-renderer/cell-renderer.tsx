import { useMemo, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { clsx } from "clsx";
import dayjs from "dayjs";

import { cellLettersKeyString } from "./../../../../../shared/constants/default";

import { parseDate } from "~src/pages/main/utils/utils";
import { workLogsChangesType } from "~src/shared/types/logs";
import { Button } from "~src/shared/ui/button/button";
import { Modal } from "~src/shared/ui/modal/modal";
import { getUserFio } from "~src/shared/utils/default";

export const CellRenderer = (params: CustomCellRendererProps<workLogsChangesType>) => {
  const data = params?.data;

  const allowedDates = useMemo(() => {
    const today = dayjs(data?.createdAt);
    return [
      today.format("YYYY-MM-DD"),
      today.subtract(1, "day").format("YYYY-MM-DD"),
      today.subtract(2, "day").format("YYYY-MM-DD")
    ];
  }, [data?.createdAt]);

  const [isVisible, setVisible] = useState<boolean>(false);

  const hasImportantChanges = useMemo(() => {
    let isHasImportantMessage = false;
    let isHasLessImportantMessage = false;
    const dataToCompare = Object.entries(data?.changes ?? {});

    for (let i = 0; i < dataToCompare?.length; i++) {
      const element = dataToCompare?.[i]?.[1];

      const actualDay = dayjs(parseDate(dataToCompare?.[i]?.[0]));

      if (element?.was === null || element?.became === null) {
        continue;
      }

      if (
        ((typeof element?.was === "string" && typeof element?.became === "object") ||
          (typeof element?.became === "string" && typeof element?.was === "object") ||
          (typeof element?.became === "string" && typeof element?.was === "string")) &&
        !allowedDates.includes(actualDay.format("YYYY-MM-DD"))
      ) {
        isHasImportantMessage = true;
      } else if (
        typeof element?.was === "object" &&
        typeof element?.became === "object" &&
        !allowedDates.includes(actualDay.format("YYYY-MM-DD"))
      ) {
        isHasLessImportantMessage = true;
      }
    }
    return { isHasImportantMessage, isHasLessImportantMessage };
  }, [allowedDates, data?.changes]);

  return (
    <>
      <Button className=" max-h-7 relative" onClick={() => setVisible(true)}>
        Открыть изменения
        {(hasImportantChanges?.isHasImportantMessage ||
          hasImportantChanges?.isHasLessImportantMessage) && (
          <div
            className={clsx(
              "absolute -top-[7px] -right-2 w-4 h-4 rounded-full flex items-center justify-center",
              hasImportantChanges?.isHasImportantMessage && "bg-red-500",
              hasImportantChanges?.isHasLessImportantMessage && "bg-yellow-400"
            )}>
            !
          </div>
        )}
      </Button>
      <Modal
        title={`Изменения табеля`}
        width={700}
        className="p-1"
        state={isVisible}
        setState={setVisible}>
        <div className="flex flex-col">
          <div className="text-center">
            <div>Объект: {data?.facility?.name}</div>
            <div>Сотрудник: {getUserFio(data?.employee)}</div>
            <div>Дата табеля(месяц-год): {data?.date}</div>
            <div>
              <span className="font-medium">Дата изменения значений</span>:{" "}
              {dayjs(data?.createdAt)?.format("DD.MM.YYYY HH:mm:ss")}
            </div>
          </div>
          <div className="flex flex-row w-full justify-between mt-5">
            <div className="border-[1px] w-1/2 h-full flex justify-center items-center border-b-0">
              Было
            </div>
            <div className="border-[1px] w-1/2 h-full flex justify-center items-center border-b-0">
              Стало
            </div>
          </div>
          <div className="border-[1px]">
            {data?.changes && (
              <div className="flex flex-col">
                {Object.entries(data?.changes).map(([key, value]) => {
                  let wasValue = "Пусто";
                  let becameValue = "Пусто";
                  let isImportantChanges = false;
                  let isHasLessImportantMessage = false;

                  const actualDay = dayjs(parseDate(key));

                  if (
                    ((typeof value?.was === "string" && typeof value?.became === "object") ||
                      (typeof value?.became === "string" && typeof value?.was === "object") ||
                      (typeof value?.became === "string" && typeof value?.was === "string")) &&
                    !allowedDates.includes(actualDay.format("YYYY-MM-DD"))
                  ) {
                    isImportantChanges = true;
                  } else if (
                    typeof value?.was === "object" &&
                    typeof value?.became === "object" &&
                    !allowedDates.includes(actualDay.format("YYYY-MM-DD"))
                  ) {
                    isHasLessImportantMessage = true;
                  }

                  const getValueDisplay = (entry: any) => {
                    if (entry === null) return "Пусто";
                    if (typeof entry === "string") {
                      return (
                        cellLettersKeyString[entry as keyof typeof cellLettersKeyString] ?? "Пусто"
                      );
                    }
                    if (typeof entry === "object") {
                      if (entry.total) {
                        return `Часы: ${String(entry.total)}`;
                      }
                      const parts = [];
                      if (typeof entry.day === "number") parts.push(`День: ${String(entry.day)}`);
                      if (typeof entry.night === "number")
                        parts.push(`Ночь: ${String(entry.night)}`);
                      if (typeof entry.overwork === "number")
                        parts.push(`Переработки: ${String(entry.overwork)}`);
                      return parts.join("\n") || "Пусто";
                    }
                    return "Пусто";
                  };

                  wasValue = getValueDisplay(value.was);
                  becameValue = getValueDisplay(value.became);

                  return (
                    <div className="border-b-[1px]">
                      <div className="text-center">
                        <span className="font-medium">Дата измененной ячейки</span>: {key}
                      </div>
                      <div
                        className={clsx(
                          "flex flex-row justify-between w-full border-t-[1px]",
                          wasValue !== "Пусто" && isImportantChanges && "text-red-500",
                          isHasLessImportantMessage && "text-yellow-300"
                        )}>
                        <div className="w-1/2 flex items-center justify-center h-full whitespace-pre text-center">
                          {wasValue}
                        </div>
                        <div className="w-1/2 flex items-center justify-center h-full whitespace-pre text-center">
                          {becameValue}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
