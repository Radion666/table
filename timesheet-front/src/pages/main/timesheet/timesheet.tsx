import React, { HTMLProps, MemoExoticComponent, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { defaultHeaders } from "../utils/constants";
import { daysInMonth, getDaysInMonth } from "../utils/utils";

import { TableCell } from "./components/table-cell/table-cell";
import { employeeDatesType, employeeType, filledDateValueTye } from "./data";

import { Scrollbar } from "~src/components/scrollbar/Scrollbar";
import { apiRequests } from "~src/shared/api/requests";
import { monthsNameByNumberLocal } from "~src/shared/constants/default";
import { Button } from "~src/shared/ui/button/button";
import { getShortUserFio, removeLeadingZeroFromDate } from "~src/shared/utils/default";

type tableValueType = (object: employeeType) => string;

export type fieldType = "input" | "text" | "info";
export type headerCellType = "worker" | "location" | "field" | "total" | "info";
export interface headerType {
  label: string;
  type: headerCellType;
  value: keyof employeeType | tableValueType | string;
  className?: HTMLProps<HTMLElement>["className"];
  fieldType: fieldType;
  isWeekend?: boolean;
  dayName?: string;
  renderer?: MemoExoticComponent<() => React.JSX.Element>;
  cellRenderer?: MemoExoticComponent<
    ({ employeeTotal }: { employeeTotal: employeeTotalType }) => React.JSX.Element
  >;
}

export const TimesheetPage = () => {
  const { id: facilityId } = useParams();

  const [currentDate, setCurrentDate] = useState<string>(dayjs().format());

  const [currentMonth, currentYear] = useMemo(() => {
    const objected = dayjs(currentDate);

    return [objected.month() + 1, objected.year()];
  }, [currentDate]);

  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: [facilityId, currentDate, "table data by date facility"],
    queryFn: () => apiRequests.getWorkLogs(dayjs(currentDate)?.format("MM-YYYY"), +facilityId)
  });

  const { data: allWorkers, isLoading: allWorkersLoading } = useQuery({
    queryKey: ["all worker by id", facilityId, currentDate],
    queryFn: () =>
      apiRequests.getWorkersByFacilityId(
        facilityId ? +facilityId : 0,
        dayjs(currentDate)?.format("MM-YYYY")
      )
  });

  const [tableHeaders, setTableHeader] = useState<headerType[]>([]);
  const [daysInMonth, setDaysInMonths] = useState<daysInMonth[]>(getDaysInMonth(0));

  useEffect(() => {
    const firstDate = dayjs();
    const secondDate = dayjs(currentDate);
    const diffInMonths = secondDate.diff(firstDate, "month");
    setDaysInMonths(getDaysInMonth(diffInMonths));
  }, [currentDate]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [innerData, setInnerData] = useState<employeeType[]>([]);

  useEffect(() => {
    const newDates = {};
    for (let i = 0; i < daysInMonth.length; i++) {
      const day = daysInMonth[i].date;
      newDates[day] = "";
    }

    const filledDates: Record<string, filledDateValueTye> = {};

    for (const i in newDates) {
      filledDates[i] = {
        day: "0",
        night: "0",
        overwork: "0"
      };
    }

    if (allWorkers?.data) {
      const newInnerData = [
        ...allWorkers.data.map((el, index) => {
          return {
            fullName: getShortUserFio(el),
            position: el?.position?.name,
            local: Number(!el?.isOutOfTown),
            employeeId: el.id,
            facilityId: +facilityId,
            employmentPeriods: el.employmentPeriods,
            facilityPeriods: el.facilityPeriods,
            dates: {
              //@ts-ignore
              ...(newDates as never)
            },
            total: {
              countOfWeekendWorkDays: 0,
              countOfWorkDays: 0,
              hoursOfDay: 0,
              hoursOfNight: 0,
              hoursOfOverworkMoreTwoHours: 0,
              hoursOfOverworkTwoHours: 0,
              hoursOfWeekendWorkDays: 0
            }
          };
        }),
        {
          fullName: "",
          isTotal: true,
          dates: { ...filledDates },
          employeeId: Date.now(),
          local: 0,
          position: "",
          total: {
            countOfWeekendWorkDays: 0,
            countOfWorkDays: 0,
            hoursOfDay: 0,
            hoursOfNight: 0,
            hoursOfOverworkMoreTwoHours: 0,
            hoursOfOverworkTwoHours: 0,
            hoursOfWeekendWorkDays: 0
          }
        }
      ];

      if (logsData?.data?.length) {
        const copyOfPrev = structuredClone(newInnerData);

        for (let i = 0; i < copyOfPrev?.length; i++) {
          const element = copyOfPrev[i];

          const isEmployeeExistsInLogs = logsData?.data?.find(
            (emp) => emp?.employee?.id === element?.employeeId
          );

          if (isEmployeeExistsInLogs) {
            const newDates: employeeDatesType = {};

            for (const keyOfNew in element.dates) {
              const newDate = isEmployeeExistsInLogs?.workDays[keyOfNew];

              if (!newDate) {
                newDates[keyOfNew] = "";
              } else {
                if (typeof newDate === "string") {
                  newDates[keyOfNew] = newDate;
                } else if (newDate === null) {
                  newDates[keyOfNew] = "";
                } else {
                  newDates[keyOfNew] = {
                    day: String(newDate?.day),
                    night: String(newDate?.night),
                    overwork: String(newDate?.overwork)
                  };
                }
              }
            }
            element.dates = {
              ...newDates
            };

            copyOfPrev[i] = {
              ...copyOfPrev[i],
              dates: element.dates
            };
          }
        }
        const existisingEmployeeIds = copyOfPrev.map((employee) => employee.employeeId);

        const notExistsingEmployees = logsData?.data?.filter(
          (log) => !existisingEmployeeIds?.includes(log?.employee?.id)
        );

        if (notExistsingEmployees?.length) {
          for (let i = 0; i < notExistsingEmployees?.length; i++) {
            const employee = notExistsingEmployees?.[i];

            const newDates: employeeDatesType = {};

            for (const keyOfNew in employee.workDays) {
              const newDate = employee?.workDays[keyOfNew];

              if (!newDate) {
                newDates[keyOfNew] = "";
              } else {
                if (typeof newDate === "string") {
                  newDates[keyOfNew] = newDate;
                } else if (newDate === null) {
                  newDates[keyOfNew] = "";
                } else {
                  newDates[keyOfNew] = {
                    day: String(newDate?.day),
                    night: String(newDate?.night),
                    overwork: String(newDate?.overwork)
                  };
                }
              }
            }

            copyOfPrev?.splice(copyOfPrev?.length - 1, 0, {
              dates: newDates,
              employeeId: employee.employee?.id,
              facilityId: employee?.facilityId,
              employmentPeriods: [],
              facilityPeriods: [],

              fullName: getShortUserFio(employee?.employee),
              isTotal: undefined,
              local: undefined,
              position: "Нет данных",
              total: {
                countOfWeekendWorkDays: 0,
                countOfWorkDays: 0,
                hoursOfDay: 0,
                hoursOfNight: 0,
                hoursOfOverworkMoreTwoHours: 0,
                hoursOfOverworkTwoHours: 0,
                hoursOfWeekendWorkDays: 0
              }
            });
          }
        }

        setInnerData(copyOfPrev);
        for (let i = 0; i < copyOfPrev?.length; i++) {
          const id = copyOfPrev[i].employeeId;

          updateTotalOfCurrentEditing(id);
        }
        updateTotalOfAll();
      } else {
        setInnerData(newInnerData);
      }
    }
  }, [allWorkers?.data, daysInMonth, facilityId, logsData?.data]);

  const rowVirtualizer = useVirtualizer({
    count: innerData.length,
    getScrollElement: () => contentRef.current,
    estimateSize: () => 100,
    overscan: 5
  });
  useEffect(() => {
    const handler = () => {
      rowVirtualizer.measure();
    };

    window.addEventListener("resize", handler);

    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const copyOfDefaultHeader = defaultHeaders.map((el) => ({
      ...el
    }));
    copyOfDefaultHeader.splice(
      3,
      0,
      ...daysInMonth.map((day) => ({
        fieldType: "input" as any,
        label: removeLeadingZeroFromDate(day.date.split(".")?.[0]),
        value: day.date,
        isWeekend: day.isWeekend,
        dayName: day.dayName,
        type: "field"
      }))
    );
    setTableHeader(copyOfDefaultHeader);
  }, [daysInMonth]);

  const updateTotalOfCurrentEditing = (id: number) => {
    setInnerData((prev) => {
      const copyOfPrev = structuredClone(prev);
      const indexOfCurrentId = copyOfPrev.findIndex((prevField) => prevField.employeeId === id);
      let hoursOfDay: number = 0;
      let hoursOfNight: number = 0;
      let countOfWorkDays: number = 0;
      let hoursOfWeekendWorkDays: number = 0;
      let countOfWeekendWorkDays: number = 0;
      let hoursOfOverworkTwoHours: number = 0;
      let hoursOfOverworkMoreTwoHours: number = 0;

      for (const i in copyOfPrev[indexOfCurrentId].dates) {
        const element = copyOfPrev[indexOfCurrentId].dates[i];
        const isWeekend = daysInMonth.find((day) => day.date === i)?.isWeekend;

        if (typeof element === "object" && element.overwork && !isWeekend) {
          const value = +element.overwork;

          if (value <= 2) {
            hoursOfOverworkTwoHours += value;
          }
          if (value > 2) {
            hoursOfOverworkTwoHours += 2;
            hoursOfOverworkMoreTwoHours += value - 2;
          }
        }

        if (typeof element === "object" && !isWeekend) {
          hoursOfDay += +element.day;
          hoursOfNight += +element.night;
          if (+element?.day || +element?.night) countOfWorkDays += 1;
        } else if (typeof element === "object" && isWeekend) {
          hoursOfWeekendWorkDays += (+element?.day || 0) + (+element.night || 0);

          if (+element.day || +element.night) {
            countOfWeekendWorkDays += 1;
          }
        }
      }

      copyOfPrev[indexOfCurrentId].total = {
        hoursOfDay,
        hoursOfNight,
        countOfWorkDays,
        countOfWeekendWorkDays,
        hoursOfWeekendWorkDays,
        hoursOfOverworkTwoHours,
        hoursOfOverworkMoreTwoHours
      };
      return copyOfPrev;
    });
  };

  const updateTotalOfAll = () => {
    setInnerData((prev) => {
      const copyOfPrev = structuredClone(prev);
      const totalDays = daysInMonth;

      for (let i = 0; i < totalDays.length; i++) {
        let totalDayHours: number = 0;
        let totalNigthHours: number = 0;
        let totalOverworkHours: number = 0;

        const date = totalDays[i].date;

        const currentDayValues = copyOfPrev?.flatMap((element) => {
          if (element.isTotal) return undefined;
          return element.dates[date];
        });

        for (let j = 0; j < currentDayValues.length; j++) {
          const currentDayValue = currentDayValues[j];
          if (typeof currentDayValue === "object") {
            totalDayHours += +currentDayValue.day;
            totalNigthHours += +currentDayValue.night;
            totalOverworkHours += +currentDayValue.overwork;
          }
        }
        copyOfPrev[copyOfPrev?.length - 1].dates[date] = {
          day: String(totalDayHours),
          night: String(totalNigthHours),
          overwork: String(totalOverworkHours)
        };
      }

      let hoursOfDay: number = 0;
      let hoursOfNight: number = 0;
      let countOfWorkDays: number = 0;
      let hoursOfWeekendWorkDays: number = 0;
      let countOfWeekendWorkDays: number = 0;
      let hoursOfOverworkTwoHours: number = 0;
      let hoursOfOverworkMoreTwoHours: number = 0;

      const totalOfAllElements = copyOfPrev?.flatMap((prevCopy) =>
        prevCopy.isTotal ? undefined : prevCopy.total
      );

      for (let i = 0; i < totalOfAllElements.length; i++) {
        const totalOfElement = totalOfAllElements[i];
        hoursOfDay += +(totalOfElement?.hoursOfDay ?? 0);
        hoursOfNight += +(totalOfElement?.hoursOfNight ?? 0);
        countOfWorkDays += +(totalOfElement?.countOfWorkDays ?? 0);
        hoursOfWeekendWorkDays += +(totalOfElement?.hoursOfWeekendWorkDays ?? 0);
        countOfWeekendWorkDays += +(totalOfElement?.countOfWeekendWorkDays ?? 0);
        hoursOfOverworkTwoHours += +(totalOfElement?.hoursOfOverworkTwoHours ?? 0);
        hoursOfOverworkMoreTwoHours += +(totalOfElement?.hoursOfOverworkMoreTwoHours ?? 0);
      }

      copyOfPrev[copyOfPrev.length - 1].total = {
        hoursOfDay,
        hoursOfNight,
        countOfWorkDays,
        countOfWeekendWorkDays,
        hoursOfWeekendWorkDays,
        hoursOfOverworkTwoHours,
        hoursOfOverworkMoreTwoHours
      };

      return copyOfPrev;
    });
  };

  return (
    <div className="flex flex-col flex-1 p-5 ">
      <div className="flex justify-between">
        <div className="flex gap-5 items-center">
          <div>
            <span className="font-bold">Текущая дата: </span>{" "}
            {monthsNameByNumberLocal[currentMonth]} {currentYear}
          </div>
          <Button
            type="default"
            className="ml-5 h-6"
            onClick={() => {
              setCurrentDate((prev) => {
                return dayjs(prev).subtract(1, "month");
              });
            }}>
            Предыдущий месяц
          </Button>
          <Button
            type="default"
            className="h-6"
            onClick={() => {
              setCurrentDate((prev) => {
                const nextDate = dayjs(prev).add(1, "month");
                if (dayjs(nextDate) > dayjs()) return prev;
                return nextDate;
              });
            }}>
            Следующий месяц
          </Button>
        </div>
        <Button
          className="mr-5"
          onClick={() => {
            apiRequests.saveWorkLogs(innerData, facilityId ? +facilityId : undefined).then(() => {
              toast.success("Успешно обновлено");
              setTimeout(() => {
                window.location.reload();
              }, 500);
            });
          }}>
          Сохранить
        </Button>
      </div>
      <div className="mb-2 text-center flex items-center justify-between flex-row-reverse gap-5">
        {/* <Icon
          className={clsx("cursor-pointer text-[#343434], hover:text-[#B74858]")}
          name="Excel"
          size={24}
        /> */}
      </div>
      <div className="flex-1" ref={containerRef}>
        <div
          ref={headerRef}
          className="flex rounded-t-md  overflow-x-hidden scrollbar-hide border-l-[1px] border-r-[1px] md:min-w-[calc(100vw-200px)] md:max-w-[calc(100vw-200px)] min-h-[110px] max-h-[110px]">
          {tableHeaders.map((day, index) => (
            <div
              key={day.label}
              className={clsx(
                day.className && day.className,
                "min-w-16 border-b-[1px] border-b-black flex-1 border-r-[1px] bg-[#fafafa]  shadow-md flex items-center justify-center text-center ",
                day.isWeekend && "bg-gray-300",
                day.dayName && "flex flex-col"
              )}>
              {day.renderer ? (
                <>
                  <day.renderer />
                </>
              ) : (
                <div className="w-full h-full">
                  <div
                    className={clsx(
                      "flex items-center justify-center",
                      day.dayName && "border-b-[1px] flex items-center justify-center h-1/2 w-full",
                      !day.dayName && "h-full"
                    )}>
                    {day.label}
                  </div>
                  {day.dayName && (
                    <div className="uppercase h-1/2 items-center justify-center flex">
                      {day.dayName}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <Scrollbar
          className="w-full border-l-[1px] border-r-[1px] md:min-w-[calc(100vw-200px)] md:max-w-[calc(100vw-200px)] md:min-h-[calc(100vh-200px)] md:max-h-[calc(100vh-200px)] min-h-[calc(100vh-325px)] max-h-[calc(100vh-325px)] "
          viewRef={contentRef}
          onViewScroll={(props) => {
            headerRef?.current?.scrollTo({
              left: props.scrollLeft
            });
          }}>
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
              minWidth: headerRef?.current?.scrollWidth
            }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const ppl = innerData[virtualRow.index];
              const isLast = virtualRow.index === innerData?.length - 1;
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  className="border-b-[1px] border-black  ">
                  <div className="flex h-full">
                    {tableHeaders.map((day, index) => {
                      return (
                        <>
                          {day?.cellRenderer ? (
                            <day.cellRenderer employeeTotal={ppl.total} />
                          ) : (
                            <TableCell
                              key={index}
                              isLast={isLast}
                              className={day.className}
                              dayValue={day.value as any}
                              daysInMonth={isLast ? daysInMonth : undefined}
                              headerCellType={day.type}
                              fieldType={day.fieldType}
                              label={
                                typeof day.value === "function" ? day.value(ppl) : ppl[day.value]
                              }
                              employmentPeriods={ppl.employmentPeriods}
                              facilityPeriods={ppl?.facilityPeriods}
                              value={ppl?.dates?.[day.value]}
                              isWeekend={day.isWeekend ?? false}
                              id={ppl.employeeId}
                              handleChange={(field, value, type) => {
                                setInnerData((prev) => {
                                  const copyOfPrev = structuredClone(prev);
                                  const indexOfCurrentId = copyOfPrev.findIndex(
                                    (prevField) => prevField.employeeId === ppl.employeeId
                                  );

                                  if (type) {
                                    copyOfPrev[indexOfCurrentId].dates = {
                                      ...copyOfPrev[indexOfCurrentId].dates,
                                      [field]: {
                                        ...copyOfPrev[indexOfCurrentId].dates[field],
                                        [type]: value
                                        // day: "",
                                        // night: "",
                                        // overwork: ""
                                      }
                                    };
                                  } else if (value === "delete") {
                                    copyOfPrev[indexOfCurrentId].dates = {
                                      ...copyOfPrev[indexOfCurrentId].dates,
                                      [field]: ""
                                    };
                                  } else if (value === "Я") {
                                    copyOfPrev[indexOfCurrentId].dates = {
                                      ...copyOfPrev[indexOfCurrentId].dates,
                                      [field]: {
                                        day: "",
                                        night: "",
                                        overwork: ""
                                      }
                                    };
                                  } else {
                                    copyOfPrev[indexOfCurrentId].dates = {
                                      ...copyOfPrev[indexOfCurrentId].dates,
                                      [field]: value
                                    };
                                  }

                                  return copyOfPrev;
                                });
                                updateTotalOfCurrentEditing(ppl.employeeId);
                                updateTotalOfAll();
                              }}
                            />
                          )}
                        </>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Scrollbar>
      </div>
    </div>
  );
};
