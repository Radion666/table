import React, { HTMLProps, MemoExoticComponent, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { defaultHeaders } from "../utils/constants";
import { daysInMonth, getDaysInMonth } from "../utils/utils";
import { workersStatuses } from "../workers/utils/constants";

import { TableCell } from "./components/table-cell/table-cell";
import { employeeDatesType, employeeTotalType, employeeType, filledDateValueTye } from "./data";

import { Scrollbar } from "~src/components/scrollbar/Scrollbar";
import { apiRequests } from "~src/shared/api/requests";
import { monthsNameByNumberLocal, regexes } from "~src/shared/constants/default";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { useGetAllFacilities } from "~src/shared/hooks/useRequests";
import { createWorkerType } from "~src/shared/types/employees";
import { facilityTimesheetSettingType } from "~src/shared/types/facilities";
import { Button } from "~src/shared/ui/button/button";
import { Checkbox } from "~src/shared/ui/checkbox/checkbox";
import { Icon } from "~src/shared/ui/icon/icon";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { getShortUserFio, getUserFio, removeLeadingZeroFromDate } from "~src/shared/utils/default";

type tableValueType = (object: employeeType) => string;

export type fieldType = "input" | "text" | "info" | "employee" | "location";
export type headerCellType = "worker" | "location" | "field" | "total" | "info";
export interface headerType {
  label: string | (() => React.JSX.Element);
  type: headerCellType;
  value: keyof employeeType | tableValueType | string;
  className?: HTMLProps<HTMLElement>["className"];
  fieldType: fieldType;
  isWeekend?: boolean;
  dayName?: string;
  renderer?: MemoExoticComponent<
    ({
      facilityTimesheetSetting
    }: {
      facilityTimesheetSetting?: facilityTimesheetSettingType;
    }) => React.JSX.Element
  >;
  cellRenderer?: MemoExoticComponent<
    ({
      employeeTotal,
      facilityTimesheetSetting
    }: {
      employeeTotal: employeeTotalType;
      facilityTimesheetSetting?: facilityTimesheetSettingType;
    }) => React.JSX.Element
  >;
}

export const TimesheetPage = () => {
  const { id: facilityId } = useParams();

  const { userRole, user } = useGetUser();

  const [currentDate, setCurrentDate] = useState<string>(dayjs().format());

  const [currentMonth, currentYear] = useMemo(() => {
    const objected = dayjs(currentDate);

    return [objected.month() + 1, objected.year()];
  }, [currentDate]);

  const { data: facilityByIdData } = useQuery({
    queryKey: ["facility by id", facilityId],
    queryFn: () => apiRequests.getFacilityId(+facilityId),
    enabled: facilityId !== undefined
  });

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const { data: allFacilities, isFetching: isAllFacilitiesFetching } = useGetAllFacilities({
    page: 1,
    pageSize: 1000
  });

  const {
    getValues,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setValue
  } = useForm<createWorkerType>({
    defaultValues: {
      createdById: user?.id,
      actualAddress: "",
      facilityId: +facilityId ?? null,
      firstName: "",
      isOutOfTown: true,
      lastName: "",
      masterId: userRole === "master" ? user?.id : null,
      middleName: "",
      phoneNumber: "",
      positionId: null,
      registeredAddress: "",
      status: "working"
    }
  });

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  const { data: positionsData, isFetching: isPositionsFetching } = useQuery({
    queryKey: ["facility by id", watch("facilityId")],
    queryFn: () => apiRequests.getPositionsByFacilityId(getValues("facilityId") ?? undefined),
    enabled: typeof getValues("facilityId") === "number" && userRole !== "financier"
  });

  const { data: allMastersData, isLoading: isAllMastersLoading } = useQuery({
    queryKey: ["all masters", getValues("facilityId")],
    queryFn: () => apiRequests.getEmployees("master", getValues("facilityId") ?? undefined),
    enabled: userRole !== "master" && !!watch("facilityId") && userRole !== "financier"
  });

  const [facilitySettings, setFacilitySettings] = useState<
    facilityTimesheetSettingType | undefined
  >(undefined);

  const [foundEmployeeBySearch, setFoundEmployeeBySearch] = useState<number[]>([]);
  const [searchingEmployee, setSearchingEmployee] = useState<string>("");

  useEffect(() => {
    if (searchingEmployee) {
      const foundUsers = allWorkers?.data?.filter((el) => {
        const userFullName = getUserFio(el);
        if (
          searchingEmployee?.length > 3 &&
          userFullName?.toLowerCase()?.includes(searchingEmployee?.toLocaleLowerCase())
        ) {
          return true;
        }
        return false;
      });
      if (foundUsers) {
        const foundUsersIds = foundUsers?.map((el) => el.id);
        setFoundEmployeeBySearch(foundUsersIds);

        const foundUserPosition = innerData?.findIndex(
          (el) => el.employeeId === foundUsersIds?.[0]
        );

        if (typeof foundUserPosition === "number" && foundUserPosition !== -1) {
          contentRef?.current?.scrollTo({
            top: 100 * foundUserPosition,
            behavior: "instant"
          });
        }
      }
    } else {
      setFoundEmployeeBySearch([]);
    }
  }, [searchingEmployee]);

  useEffect(() => {
    if (facilityByIdData) {
      setFacilitySettings(facilityByIdData?.settings);
    }
  }, [facilityByIdData]);

  const {
    data: allWorkers,
    isLoading: allWorkersLoading,
    refetch
  } = useQuery({
    queryKey: ["all worker by id", facilityId, currentDate],
    queryFn: () =>
      apiRequests.getWorkersByFacilityId(
        facilityId ? +facilityId : 0,
        dayjs(currentDate)?.format("MM-YYYY")
      )
  });

  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: [facilityId, currentDate, "table data by date facility", allWorkers?.data],
    queryFn: () => apiRequests.getWorkLogs(dayjs(currentDate)?.format("MM-YYYY"), +facilityId),
    enabled: !!allWorkers?.data?.length
  });

  const handleCreate = async (data: createWorkerType) => {
    await apiRequests
      .createWorker({ ...data, createdById: user?.id as number, isOutOfTown: !data?.isOutOfTown })
      .then(() => {
        toast.success("Сотрудник успешно создан");
        refetch();
        setModalOpen(false);
      });
  };

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
    const checkWidth = () => {
      const firstDate = dayjs();
      const secondDate = dayjs(currentDate);
      const diffInMonths = secondDate.diff(firstDate, "month");

      if (window.innerWidth <= 640) {
        setDaysInMonths(getDaysInMonth(diffInMonths, userRole === "master"));
      } else {
        setDaysInMonths(getDaysInMonth(diffInMonths));
      }
    };
    checkWidth();

    window.addEventListener("resize", checkWidth);

    return () => {
      window.removeEventListener("resize", checkWidth);
    };
  }, []);

  useEffect(() => {
    const newDates = {};

    const integers = facilitySettings?.integers;

    for (let i = 0; i < daysInMonth.length; i++) {
      const day = daysInMonth[i].date;
      newDates[day] = "";
    }

    const filledDates: Record<string, filledDateValueTye> = {};

    for (const i in newDates) {
      filledDates[i] = {
        day: "0",
        night: "0",
        overwork: "0",
        total: "0"
      };
    }

    if (allWorkers?.data) {
      const newInnerData = [
        ...allWorkers.data.map((el, index) => {
          const prevFromInnerData = innerData?.find((employ) => employ.employeeId === el.id);
          return {
            fullName: getShortUserFio(el),
            position: el?.position?.name,
            local: Number(!el?.isOutOfTown),
            employeeId: el.id,
            facilityId: +facilityId,
            employmentPeriods: el.employmentPeriods,
            facilityPeriods: el.facilityPeriods,
            lastIsOutOfTown: el.lastIsOutOfTown,
            lastPosition: el.lastPosition,
            dates: {
              //@ts-ignore
              ...(prevFromInnerData?.dates ?? (newDates as never))
            },
            total: prevFromInnerData?.total ?? {
              countOfWeekendWorkDays: 0,
              countOfWorkDays: 0,
              hoursOfDay: 0,
              hoursOfNight: 0,
              hoursOfOverworkMoreTwoHours: 0,
              hoursOfOverworkTwoHours: 0,
              hoursOfWeekendWorkDays: 0,
              hoursOfOnlyTotalHours: 0
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
          const prevFromInnerData = innerData?.find(
            (employ) => employ.employeeId === element.employeeId
          );

          if (isEmployeeExistsInLogs) {
            const newDates: employeeDatesType = {};

            for (const keyOfNew in element.dates) {
              const newDate = isEmployeeExistsInLogs?.workDays[keyOfNew];

              if (!newDate) {
                newDates[keyOfNew] = prevFromInnerData?.dates?.[keyOfNew] ?? "";
              } else {
                if (typeof newDate === "string") {
                  newDates[keyOfNew] = prevFromInnerData?.dates?.[keyOfNew] ?? newDate;
                } else if (newDate === null) {
                  newDates[keyOfNew] = prevFromInnerData?.dates?.[keyOfNew] ?? "";
                } else {
                  newDates[keyOfNew] = prevFromInnerData?.dates?.[keyOfNew] ?? {
                    ...(integers?.allowOnlyTotal
                      ? {
                          total: String(newDate.total)
                        }
                      : {
                          ...(integers?.allowDay && { day: String(newDate.day) }),
                          ...(integers?.allowNight && { night: String(newDate.night) }),
                          ...(integers?.allowOverwork && { overwork: String(newDate.overwork) })
                        })
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
          } else {
            continue;
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
    } else {
      setInnerData([]);
    }
  }, [logsData?.data]);

  const rowVirtualizer = useVirtualizer({
    count: innerData.length,
    getScrollElement: () => contentRef.current,
    estimateSize: () => 100,
    overscan: 2
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
      let hoursOfOnlyTotalHours: number = 0;

      for (const i in copyOfPrev[indexOfCurrentId].dates) {
        const element = copyOfPrev[indexOfCurrentId].dates[i];
        const isWeekend = daysInMonth.find((day) => day.date === i)?.isWeekend;

        if (
          typeof element === "object" &&
          facilitySettings?.integers?.allowOnlyTotal &&
          !isWeekend
        ) {
          hoursOfOnlyTotalHours += +element.total;
        }

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
          hoursOfDay += +element.day || 0 || +element?.total || 0;
          hoursOfNight += +(element.night || 0) || +element?.total || 0;
          if (+element?.day || +element?.night || +element?.total) countOfWorkDays += 1;
        } else if (typeof element === "object" && isWeekend) {
          hoursOfWeekendWorkDays += facilitySettings?.integers?.allowOnlyTotal
            ? +element?.total
            : (+element?.day || 0) + (+element.night || 0);

          if (+element.day || +element.night || +element?.total) {
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
        hoursOfOverworkMoreTwoHours,
        hoursOfOnlyTotalHours
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
        let totalTotalHours: number = 0;

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
            totalTotalHours += +currentDayValue?.total;
          }
        }
        copyOfPrev[copyOfPrev?.length - 1].dates[date] = {
          day: String(totalDayHours),
          night: String(totalNigthHours),
          overwork: String(totalOverworkHours),
          total: String(totalTotalHours)
        };
      }

      let hoursOfDay: number = 0;
      let hoursOfNight: number = 0;
      let countOfWorkDays: number = 0;
      let hoursOfWeekendWorkDays: number = 0;
      let countOfWeekendWorkDays: number = 0;
      let hoursOfOverworkTwoHours: number = 0;
      let hoursOfOverworkMoreTwoHours: number = 0;
      let hoursOfOnlyTotalHours: number = 0;

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
        hoursOfOnlyTotalHours += +(totalOfElement?.hoursOfOnlyTotalHours ?? 0);
      }

      copyOfPrev[copyOfPrev.length - 1].total = {
        hoursOfDay,
        hoursOfNight,
        countOfWorkDays,
        countOfWeekendWorkDays,
        hoursOfWeekendWorkDays,
        hoursOfOverworkTwoHours,
        hoursOfOverworkMoreTwoHours,
        hoursOfOnlyTotalHours
      };

      return copyOfPrev;
    });
  };

  return (
    <>
      <div className="flex flex-col flex-1 p-5 md:text-base text-[12px]">
        <div className="flex justify-between mb-4 md:flex-nowrap flex-wrap">
          <div className="flex gap-5 items-center">
            <div className="font-bold">
              {monthsNameByNumberLocal[currentMonth]} {currentYear}
            </div>
            <Button
              type="default"
              className="ml-5 h-6 md:text-base text-[12px]"
              onClick={() => {
                setCurrentDate((prev) => {
                  return dayjs(prev).subtract(1, "month");
                });
              }}>
              Предыдущий месяц
            </Button>
            <Button
              type="default"
              className="h-6 md:text-base text-[12px]"
              onClick={() => {
                setCurrentDate((prev) => {
                  const nextDate = dayjs(prev).add(1, "month");
                  if (dayjs(nextDate) > dayjs()) return prev;
                  return nextDate;
                });
              }}>
              Следующий месяц
            </Button>
            {userRole !== "master" && (
              <div className="mb-2 text-center flex items-center justify-between flex-row-reverse gap-5 ">
                <Icon
                  onClick={async () => {
                    apiRequests
                      .downloadReport(
                        facilityId ? +facilityId : 0,
                        dayjs(currentDate)?.format("MM-YYYY")
                      )
                      .then(async (response) => {
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "downloaded_file.xlsx";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      });
                  }}
                  className={clsx("cursor-pointer text-[#343434], hover:text-[#B74858]")}
                  name="Excel"
                  size={24}
                />
              </div>
            )}
          </div>
          <div className="flex flex-row items-center gap-4">
            {userRole !== "financier" && (
              <Button onClick={() => setModalOpen(true)}>Создать нового сотрудника</Button>
            )}

            <Input
              placeholder="Поиск работника"
              value={searchingEmployee}
              onChange={(e) => {
                setSearchingEmployee(e.target.value);
              }}
              className="relative top-1"
            />
            {userRole !== "financier" && (
              <Button
                className="mr-5"
                onClick={() => {
                  apiRequests
                    .saveWorkLogs(innerData, facilityId ? +facilityId : undefined)
                    .then(() => {
                      toast.success("Успешно обновлено");
                      setTimeout(() => {
                        // window.location.reload();
                      }, 500);
                    });
                }}>
                Сохранить
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1" ref={containerRef}>
          <div
            ref={headerRef}
            className="flex rounded-t-md  overflow-x-hidden scrollbar-hide border-l-[1px] border-r-[1px] md:min-w-[calc(100vw-140px)] md:max-w-[calc(100vw-140px)] min-h-[110px] max-h-[110px]">
            {tableHeaders.map((day, index) => (
              <div
                key={index}
                className={clsx(
                  day.className && day.className,
                  "min-w-12 max-w-12 border-b-[1px] border-b-black flex-1 border-r-[1px] bg-[#fafafa]  shadow-md flex items-center justify-center text-center ",
                  day.isWeekend && "bg-gray-300",
                  day.dayName && "flex flex-col"
                )}>
                {day.renderer ? (
                  <>
                    <day.renderer facilityTimesheetSetting={facilitySettings} />
                  </>
                ) : (
                  <div className="w-full h-full">
                    <div
                      className={clsx(
                        "flex items-center justify-center",
                        day.dayName &&
                          "border-b-[1px] flex items-center justify-center h-1/2 w-full",
                        !day.dayName && "h-full"
                      )}>
                      {typeof day.label === "string" ? day.label : day.label()}
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
            className="w-full border-l-[1px] border-r-[1px] md:min-w-[calc(100vw-140px)] md:max-w-[calc(100vw-140px)] md:min-h-[calc(100vh-200px)] md:max-h-[calc(100vh-200px)] min-h-[calc(100vh-325px)] max-h-[calc(100vh-325px)] "
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

                const isSearched = foundEmployeeBySearch?.includes(ppl.employeeId);

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
                      transform: `translateY(${virtualRow.start}px)`,
                      pointerEvents: userRole === "financier" ? "none" : "all"
                    }}
                    className={clsx(
                      "transition-all",
                      isSearched
                        ? "border-b-[2px] border-yellow-400 shadow-lg"
                        : "border-b-[1px]  border-black"
                    )}>
                    <div className="flex h-full md:text-base text-[12px]">
                      {tableHeaders.map((day, index) => {
                        return (
                          <>
                            {day?.cellRenderer ? (
                              <day.cellRenderer
                                employeeTotal={ppl.total}
                                facilityTimesheetSetting={facilitySettings}
                              />
                            ) : (
                              <TableCell
                                key={index}
                                isLast={isLast}
                                lastIsOutOfTown={ppl.lastIsOutOfTown}
                                className={day.className}
                                dayValue={day.value as any}
                                daysInMonth={isLast ? daysInMonth : undefined}
                                headerCellType={day.type}
                                fieldType={day.fieldType}
                                label={
                                  typeof day.value === "function" ? day.value(ppl) : ppl[day.value]
                                }
                                userShortName={ppl.fullName}
                                userPosition={ppl?.lastPosition?.name}
                                employmentPeriods={ppl.employmentPeriods}
                                facilityPeriods={ppl?.facilityPeriods}
                                value={ppl?.dates?.[day.value]}
                                isWeekend={day.isWeekend ?? false}
                                id={ppl.employeeId}
                                facilitySettings={facilitySettings}
                                handleChange={(field, value, type) => {
                                  setInnerData((prev) => {
                                    const copyOfPrev = structuredClone(prev);
                                    const indexOfCurrentId = copyOfPrev.findIndex(
                                      (prevField) => prevField.employeeId === ppl.employeeId
                                    );

                                    const integers = facilitySettings?.integers;

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
                                          ...(integers?.allowOnlyTotal
                                            ? {
                                                total: ""
                                              }
                                            : {
                                                ...(integers?.allowDay && { day: "" }),
                                                ...(integers?.allowNight && { night: "" }),
                                                ...(integers?.allowOverwork && { overwork: "" })
                                              })
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
      <Modal title="Создание нового сотрудника" state={isModalOpen} setState={setModalOpen}>
        <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(handleCreate)}>
          <Controller
            control={control}
            name="lastName"
            rules={{
              required: "Фамилия обязательна"
            }}
            render={({ field }) => (
              <Input errorMessage={errors?.lastName?.message} label="Фамилия" {...field} />
            )}
          />

          <Controller
            rules={{
              required: "Имя обязательно"
            }}
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input errorMessage={errors?.firstName?.message} label="Имя" {...field} />
            )}
          />

          <Controller
            rules={{
              required: "Отчество обязательно"
            }}
            control={control}
            name="middleName"
            render={({ field }) => (
              <Input errorMessage={errors?.middleName?.message} label="Отчество" {...field} />
            )}
          />

          <Controller
            rules={{
              required: "Должность обязательна"
            }}
            control={control}
            name="positionId"
            render={({ field }) => (
              <Select
                optionFilterProp="label"
                loading={isPositionsFetching}
                options={positionsData?.data?.map((position) => ({
                  value: position.id,
                  label: position.name
                }))}
                showSearch
                errorMessage={errors?.positionId?.message}
                label="Должность"
                {...field}
              />
            )}
          />

          {userRole !== "master" && (
            <Controller
              control={control}
              name="masterId"
              render={({ field }) => (
                <Select
                  optionFilterProp="label"
                  loading={isAllMastersLoading}
                  options={allMastersData?.data?.map((master) => ({
                    value: master.id,
                    label: getUserFio(master)
                  }))}
                  showSearch
                  errorMessage={errors?.masterId?.message}
                  label="Мастер"
                  {...field}
                />
              )}
            />
          )}

          <Controller
            rules={{
              required: "Статус обязателен"
            }}
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                optionFilterProp="label"
                options={workersStatuses?.map((status) => ({
                  value: status.value,
                  label: status.label
                }))}
                showSearch
                errorMessage={errors?.status?.message}
                label="Статус"
                {...field}
              />
            )}
          />

          <Controller
            rules={{
              required: "Номер телефона обязателен",
              pattern: {
                value: regexes.phone,
                message: "Номер телефона не соответствует стандарту"
              }
            }}
            control={control}
            name="phoneNumber"
            render={({ field }) => (
              <Input
                label="Номер телефона"
                isPhone
                errorMessage={errors.phoneNumber?.message}
                {...field}
              />
            )}
          />

          <Controller
            rules={{
              required: ""
            }}
            control={control}
            name="isOutOfTown"
            render={({ field }) => <Checkbox label="Местный" {...field} />}
          />

          <Controller
            control={control}
            name="registeredAddress"
            render={({ field }) => <Input label="Адрес регистрации" {...field} />}
          />
          <Controller
            control={control}
            name="actualAddress"
            render={({ field }) => <Input label="Адрес фактического проживания" {...field} />}
          />

          <div className="flex justify-center mt-4">
            <Button htmlType="submit">Сохранить</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
