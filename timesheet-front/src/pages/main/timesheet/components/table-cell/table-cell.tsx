import { FC, HTMLProps, memo, useMemo, useState } from "react";

import clsx from "clsx";
import dayjs from "dayjs";

import { dateValueType, employeeType } from "../../data";
import { fieldType, headerCellType } from "../../timesheet";

import { CellInput } from "./component/cell-input";
import { Indentificators } from "./component/identificators";

import { dateRegex, daysInMonth, parseDate } from "~src/pages/main/utils/utils";
import { workerStatuses } from "~src/pages/main/workers/utils/constants";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { employmentPeriodsType, facilityPeriodsType } from "~src/shared/types/employees";

interface TableCellProps {
  label: string;
  dayValue: string;
  fieldType: fieldType;
  className?: HTMLProps<HTMLElement>["className"];
  value: dateValueType;
  isWeekend: boolean;
  id: number;
  handleChange: (field: string, value: dateValueType, type?: string) => void;
  allElements?: employeeType[];
  headerCellType: headerCellType;
  daysInMonth?: daysInMonth[];
  isLast?: boolean;
  employmentPeriods: employmentPeriodsType[];
  facilityPeriods: facilityPeriodsType[];
}

export const TableCell: FC<TableCellProps> = memo(
  ({
    label,
    fieldType,
    className,
    value,
    isWeekend,
    handleChange,
    dayValue,
    headerCellType,
    isLast,
    employmentPeriods,
    facilityPeriods
  }) => {
    const { userRole } = useGetUser();
    const [errorMsg, setErrorMsg] = useState<string>("Недоступно");

    const isDisabled = useMemo(() => {
      if (dayValue && dateRegex.test(dayValue) && employmentPeriods?.length) {
        const cellDate = dayjs(parseDate(dayValue));

        for (let i = 0; i < facilityPeriods?.length; i++) {
          const facilityPeriod = facilityPeriods?.[i];

          if (facilityPeriod?.endDate === null) {
            break;
          }

          const startDate = dayjs(facilityPeriod?.startDate);
          const endDate = dayjs(facilityPeriod?.endDate);

          if (
            (startDate?.isBefore(cellDate) || startDate?.isSame(cellDate, "day")) &&
            (endDate?.isAfter(cellDate) || endDate?.isSame(cellDate))
          ) {
            continue;
          } else {
            setErrorMsg("Удален\nиз\nобъекта");
            return true;
          }
        }

        for (let i = 0; i < employmentPeriods?.length; i++) {
          const period = employmentPeriods?.[i];

          const isAfterStartDate = cellDate?.isAfter(period.startDate);
          const isBeforeEndDate = cellDate?.isBefore(period.endDate);
          const isSameAsStartDate = cellDate?.isSame(period.startDate, "day");
          const isSameAsEndDate = cellDate?.isSame(period.endDate, "day");

          const isCoincidingWithBoth = isSameAsStartDate && isSameAsEndDate;

          if (period.status === "working") {
            if (dayjs(period?.startDate)?.isAfter(cellDate)) {
              setErrorMsg("Н/У");
            }
          }
          if (
            (period?.status === "archived" || period?.status === "fired") &&
            period?.endDate === null &&
            cellDate.isAfter(period?.startDate)
          ) {
            setErrorMsg(workerStatuses[period?.status]);
          }

          if (
            period.endDate === null &&
            cellDate.isAfter(period?.startDate) &&
            period?.status === "working"
          ) {
            return false;
          } else if (
            period.endDate !== null &&
            period.status === "working" &&
            dayjs(period?.startDate)?.isBefore(cellDate) &&
            dayjs(period?.endDate)?.isAfter(cellDate)
          ) {
            return false;
          } else if (
            (isAfterStartDate && isBeforeEndDate) ||
            (isCoincidingWithBoth &&
              (period.endDate === null
                ? true
                : dayjs(period?.endDate)?.diff(period.startDate, "hour") > 8))
          ) {
            return false;
          }
        }

        return true;
        // return new Date(parseDate(dayValue)) > new Date(firedAt);
      }
      return false;
    }, [dayValue, employmentPeriods, facilityPeriods]);

    const allowedToMaster = useMemo(() => {
      if (userRole === "master" && !isLast) {
        if (dateRegex.test(dayValue)) {
          const actualDay = dayjs(parseDate(dayValue));

          const today = dayjs();

          const allowedDates = [
            today.format("YYYY-MM-DD"),
            today.subtract(1, "day").format("YYYY-MM-DD"),
            today.subtract(2, "day").format("YYYY-MM-DD")
          ];

          return allowedDates.includes(actualDay.format("YYYY-MM-DD"));
        }
        return true;
      }
      return true;
    }, [dayValue, userRole, isLast]);

    const isNotAllowed = useMemo(() => {
      if (dayValue && dateRegex.test(dayValue) && !isLast) {
        const today = dayjs()?.startOf("day");
        const parsedDate = dayjs(parseDate(dayValue));

        if (dayjs(parsedDate)?.startOf("day")?.format() > today?.format()) {
          return true;
        }
        return false;
      }
      return false;
    }, [dayValue, isLast]);

    return (
      <div
        tabIndex={-1}
        className={clsx(
          className && className,
          "min-w-16 flex-1  border-r-[1px]  flex items-center justify-center text-center z-20  max-w-16 ",
          isWeekend && "bg-gray-300",
          fieldType === "input" && "hover:bg-blue-200 hover:bg-opacity-20 transition-all",
          (isDisabled || !allowedToMaster || isNotAllowed) &&
            "bg-slate-50 opacity-50 pointer-events-none cursor-not-allowed"
        )}>
        {isLast ? (
          <>
            {headerCellType === "worker" ? (
              <div className="flex flex-col h-full w-full">
                <div className="h-1/3 border-b-[1px] flex items-center justify-center">
                  Итого: дневных
                </div>
                <div className="h-1/3 border-b-[1px] flex items-center justify-center">
                  Итого: ночных
                </div>
                <div className="h-1/3 flex items-center justify-center">Итого: переработка</div>
              </div>
            ) : (
              <>
                {headerCellType === "info" ? (
                  <Indentificators />
                ) : (
                  <>
                    {headerCellType === "field" && typeof value === "object" ? (
                      <div className="flex flex-col w-full h-full">
                        <div className="h-1/3 w-full flex items-center justify-center border-b-[1px]">
                          {value?.day}
                        </div>
                        <div className="h-1/3 w-full flex items-center justify-center border-b-[1px]">
                          {value?.night}
                        </div>
                        <div className="h-1/3 w-full flex items-center justify-center">
                          {value?.overwork}
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {isDisabled && !isNotAllowed ? (
              <div className="overflow-hidden text-sm">{errorMsg}</div>
            ) : (
              <>
                {fieldType === "text" ? (
                  <>{label}</>
                ) : fieldType === "info" ? (
                  <Indentificators />
                ) : (
                  <CellInput value={value} handleChange={handleChange} field={dayValue} />
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }
);
