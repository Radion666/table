import { FC, HTMLProps, memo, useMemo, useState } from "react";

import clsx from "clsx";
import dayjs, { Dayjs } from "dayjs";

import { dateValueType, employeeType } from "../../data";
import { fieldType, headerCellType } from "../../timesheet";

import { CellInput } from "./component/cell-input";
import { Indentificators } from "./component/identificators";

import { dateRegex, daysInMonth, parseDate } from "~src/pages/main/utils/utils";
import { workerStatuses } from "~src/pages/main/workers/utils/constants";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { employmentPeriodsType, facilityPeriodsType } from "~src/shared/types/employees";
import { facilityTimesheetSettingType } from "~src/shared/types/facilities";

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
  lastIsOutOfTown: boolean;
  userShortName?: string;
  userPosition?: string;
  facilitySettings?: facilityTimesheetSettingType;
}

const checkDate = (dateToCheck: Dayjs) => {
  const today = dayjs();
  const dayOfMonth = today.date();

  const date = dayjs(dateToCheck);

  if (dayOfMonth >= 15) {
    return date.isBefore(today.startOf("month"));
  } else {
    return date.isBefore(today.subtract(1, "month").startOf("month"));
  }
};

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
    facilityPeriods,
    lastIsOutOfTown,
    userPosition,
    userShortName,
    facilitySettings
  }) => {
    const { userRole } = useGetUser();
    const [errorMsg, setErrorMsg] = useState<string>("Недоступно");

    const cellParsedDate = useMemo(() => {
      if (dayValue && dateRegex.test(dayValue) && employmentPeriods?.length) {
        return dayjs(parseDate(dayValue));
      }
      return undefined;
    }, [dayValue, employmentPeriods?.length]);

    const isDisabled = useMemo(() => {
      if (dayValue && dateRegex.test(dayValue) && employmentPeriods?.length) {
        const cellDate = dayjs(parseDate(dayValue));

        const today = dayjs();

        if (cellDate.isAfter(today)) {
          setErrorMsg("");
          return true;
        }

        for (let i = 0; i < facilityPeriods?.length; i++) {
          const facilityPeriod = facilityPeriods?.[i];

          const newFacilityPeriod = {
            ...facilityPeriod,
            startDate: dayjs(facilityPeriod.startDate)?.format(),
            createdAt: dayjs(facilityPeriod.createdAt)?.format()
          };

          const startDate = dayjs(newFacilityPeriod?.startDate);
          const endDate = dayjs(newFacilityPeriod?.endDate);

          if (
            newFacilityPeriod?.endDate === null &&
            (cellDate.isSame(startDate, "day") || cellDate.isAfter(startDate))
          ) {
            break;
          }

          if (
            (startDate?.isBefore(cellDate) || startDate?.isSame(cellDate, "day")) &&
            (endDate?.isAfter(cellDate) || endDate?.isSame(cellDate, "day"))
            // && dayjs(endDate)?.diff(startDate, "hour") > 1
          ) {
            break;
          } else {
            if (cellDate.isAfter(endDate) || cellDate.isSame(endDate, "day")) {
              setErrorMsg("Удален\nиз\nобъекта");
              return true;
            }
            // setErrorMsg("Н/у");
            return true;
          }
        }

        if (checkDate(cellDate)) {
          setErrorMsg("");
          return true;
        }

        for (let i = 0; i < employmentPeriods?.length; i++) {
          const period = employmentPeriods?.[i];

          const newPeriod = {
            ...period,
            startDate: dayjs(period.startDate)?.format(),
            createdAt: dayjs(period.createdAt)?.format(),
            endDate: period.endDate ? dayjs(period.endDate)?.format() : null
          };

          const isAfterStartDate = cellDate?.isAfter(newPeriod.startDate);
          const isBeforeEndDate = cellDate?.isBefore(newPeriod.endDate);
          const isSameAsStartDate = cellDate?.isSame(newPeriod.startDate, "day");
          const isSameAsEndDate = cellDate?.isSame(newPeriod.endDate, "day");

          const isCoincidingWithBoth = isSameAsStartDate && isSameAsEndDate;

          if (newPeriod.status === "working") {
            if (cellDate?.isSame(newPeriod.startDate, "day") && newPeriod.endDate === null) {
              return false;
            }

            if (dayjs(newPeriod?.startDate)?.isAfter(cellDate)) {
              // setErrorMsg("Н/У");
            }
          }
          if (
            (newPeriod?.status === "archived" || newPeriod?.status === "fired") &&
            newPeriod?.endDate === null &&
            cellDate.isAfter(newPeriod?.startDate)
          ) {
            setErrorMsg(workerStatuses[newPeriod?.status]);
          }

          if (
            newPeriod.endDate === null &&
            cellDate.isAfter(newPeriod?.startDate) &&
            newPeriod?.status === "working"
          ) {
            return false;
          } else if (
            newPeriod.endDate !== null &&
            newPeriod.status === "working" &&
            dayjs(newPeriod?.startDate)?.isBefore(cellDate) &&
            dayjs(newPeriod?.endDate)?.isAfter(cellDate)
          ) {
            return false;
          } else if (
            (isAfterStartDate && isBeforeEndDate) ||
            (isCoincidingWithBoth && (newPeriod.endDate === null ? true : true))
            // dayjs(newPeriod?.endDate)?.diff(newPeriod.startDate, "hour") > 8
          ) {
            return false;
          }
        }

        return true;
        // return new Date(parseDate(dayValue)) > new Date(firedAt);
      }
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

    const integers = facilitySettings?.integers;

    const getAllowableHours = () => {
      const result = [];

      if (integers?.allowOnlyTotal) {
        return ["часов"];
      }

      if (integers?.allowDay) {
        result.push("дневных");
      }
      if (integers?.allowNight) {
        result.push("ночных");
      }
      if (integers?.allowOverwork) {
        result.push("переработка");
      }

      return result.length > 0 ? result : [];
    };

    const getAllowedFields = () => {
      const fields = [];

      if (integers?.allowOnlyTotal) {
        return ["total"];
      }

      if (integers?.allowDay) {
        fields.push("day");
      }
      if (integers?.allowNight) {
        fields.push("night");
      }
      if (integers?.allowOverwork) {
        fields.push("overwork");
      }

      return fields.length > 0 ? fields : [];
    };

    const allowableHours = getAllowableHours();
    const numberOfHours = allowableHours.length;

    const allowedFields = getAllowedFields();

    const heightPercentage = numberOfHours === 1 ? 100 : 100 / numberOfHours;

    return (
      <div
        tabIndex={-1}
        className={clsx(
          className && className,
          "min-w-12 flex-1  border-r-[1px]  flex items-center justify-center text-center z-20  max-w-12",
          isWeekend && "bg-gray-300",
          fieldType === "input" && "",
          (isDisabled || !allowedToMaster || isNotAllowed) &&
            "bg-slate-100 opacity-50  cursor-not-allowed"
        )}>
        {isLast ? (
          <>
            {headerCellType === "worker" ? (
              <div className="flex flex-col h-full w-full">
                {allowableHours?.map((el) => (
                  <div
                    className="border-b-[1px] flex items-center justify-center"
                    style={{ height: `${heightPercentage}%` }}>
                    Итого: {el}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {headerCellType === "info" ? (
                  <Indentificators />
                ) : (
                  <>
                    {headerCellType === "field" && typeof value === "object" ? (
                      <div className="flex flex-col w-full h-full">
                        {allowedFields?.map((fld) => (
                          <div
                            className=" w-full flex items-center justify-center border-b-[1px]"
                            style={{ height: `${heightPercentage}%` }}>
                            {value[`${fld}`]}
                          </div>
                        ))}
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
              <div className="overflow-hidden text-sm text-ellipsis text-nowrap">{errorMsg}</div>
            ) : (
              <>
                {fieldType === "text" ? (
                  <>{label}</>
                ) : fieldType === "info" ? (
                  <Indentificators facilitySettings={facilitySettings} />
                ) : fieldType === "employee" ? (
                  <div>
                    <div>{userShortName ?? ""}</div>
                    <div className="text-gray-300">{userPosition ?? ""}</div>
                  </div>
                ) : (
                  <CellInput
                    value={value}
                    handleChange={handleChange}
                    field={dayValue}
                    date={cellParsedDate}
                    isDisabled={isDisabled || !allowedToMaster || isNotAllowed}
                    facilitySettings={facilitySettings}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }
);
