import { Dispatch, FC, HTMLProps, memo, SetStateAction, useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import dayjs, { Dayjs } from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { dateValueType, employeeType } from "../../data";
import { fieldType, headerCellType, totalVariantType } from "../../timesheet";

import { CellInput, cellLetters } from "./component/cell-input";
import { Indentificators } from "./component/identificators";

import { dateRegex, daysInMonth, parseDate } from "~src/pages/main/utils/utils";
import { workersStatuses, workerStatuses } from "~src/pages/main/workers/utils/constants";
import { apiRequests } from "~src/shared/api/requests";
import { regexes } from "~src/shared/constants/default";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import {
  createWorkerType,
  employmentPeriodsType,
  facilityPeriodsType,
  workerStatusType
} from "~src/shared/types/employees";
import { facilityTimesheetSettingType, productionCalendarType } from "~src/shared/types/facilities";
import { CreateEmployeeType } from "~src/shared/types/user";
import { Button } from "~src/shared/ui/button/button";
import { Checkbox } from "~src/shared/ui/checkbox/checkbox";
import { Icon } from "~src/shared/ui/icon/icon";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";

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
  productionCalendar?: productionCalendarType[];
  totalVariant: totalVariantType;
  facilityId: number;
  phoneNumber: string;
  lastName: string;
  firstName: string;
  middleName: string;
  positionId: number;
  refetch?: () => void;
  actualAddress: string;
  registeredAddress: string;
  lastStatus: string;
  index: number;
  positionColumn: boolean;
  dateColToCopy?: string;
  dateColToPaste?: string;
  setDateColToPaste?: Dispatch<SetStateAction<string | undefined>>;
  setCopyValue: Dispatch<
    SetStateAction<
      | {
          isWeekend: boolean;
          value: ({
            isDisabled: boolean;
          } & employeeType)[];
        }
      | undefined
    >
  >;
  copyValue?: {
    isWeekend: boolean;
    value: {
      isDisabled: boolean;
    } & employeeType[];
  };
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
    facilitySettings,
    productionCalendar,
    totalVariant,
    facilityId,
    id: employeeId,
    phoneNumber,
    firstName,
    middleName,
    lastName,
    positionId,
    refetch,
    actualAddress,
    registeredAddress,
    lastStatus,
    index,
    dateColToCopy,
    setCopyValue,
    copyValue,
    dateColToPaste,
    setDateColToPaste
  }) => {
    const { userRole } = useGetUser();
    const [errorMsg, setErrorMsg] = useState<string>("");

    const [isModalOpen, setModalOpen] = useState<boolean>(false);

    const cellParsedDate = useMemo(() => {
      if (dayValue && dateRegex.test(dayValue) && employmentPeriods?.length) {
        return dayjs(parseDate(dayValue));
      }
      return undefined;
    }, [dayValue, employmentPeriods?.length]);

    const isDisabled = useMemo(() => {
      if (dayValue && dateRegex.test(dayValue) && employmentPeriods?.length && !value) {
        const cellDate = dayjs(parseDate(dayValue));

        const today = dayjs();

        if (cellDate.isAfter(today, "day")) {
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
              return true;
              // setErrorMsg("Н/У");
            }
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

          if (
            (newPeriod?.status === "archived" || newPeriod?.status === "fired") &&
            newPeriod?.endDate === null &&
            cellDate.isSame(newPeriod?.startDate, "day")
          ) {
            setErrorMsg(`${workerStatuses[newPeriod?.status].slice(0, 2)}`);
            return true;
          }
        }

        return true;
        // return new Date(parseDate(dayValue)) > new Date(firedAt);
      }
    }, [dayValue, employmentPeriods, facilityPeriods, value]);

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

    const totalLettersSum = isLast && typeof value === "object" ? value.lettersSum : null;

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
        actualAddress: "",
        firstName: "",
        isOutOfTown: false,
        lastName: "",
        middleName: "",
        phoneNumber: "",
        positionId: null,
        registeredAddress: "",
        status: "working"
      }
    });

    useEffect(() => {
      setValue("actualAddress", actualAddress);
      setValue("registeredAddress", registeredAddress);
      setValue("firstName", firstName);
      setValue("isOutOfTown", lastIsOutOfTown);
      setValue("lastName", lastName);
      setValue("middleName", middleName);
      setValue("phoneNumber", phoneNumber);
      setValue("positionId", positionId);
      setValue("status", lastStatus as workerStatusType);
    }, [isModalOpen]);

    const { data: positionsData, isFetching: isPositionsFetching } = useQuery({
      queryKey: ["facility by id", positionId],
      queryFn: () => apiRequests.getPositionsByFacilityId(facilityId ?? undefined)
    });

    const [isSubmiting, setSubmiting] = useState<boolean>(false);

    const handleUpdate = async (data: CreateEmployeeType) => {
      if (data) {
        setSubmiting(true);

        await apiRequests
          .updateWorkerFromLogs(
            {
              ...(data as any),
              facilityId: +facilityId,
              isOutOfTown: !(data as any)?.isOutOfTown
            },
            employeeId
          )
          .then(() => {
            toast.success("Сотрудник успешно обновлен");
            setModalOpen(false);
            refetch?.();
          })
          .finally(() => {
            setSubmiting(false);
          });
      }
    };

    const isInnerWeekend = useMemo(() => {
      if (dayValue && dateRegex.test(dayValue)) {
        if (productionCalendar?.length) {
          const cellDate = dayjs(parseDate(dayValue));
          const cellDay = cellDate.date();

          for (let i = 0; i < productionCalendar?.length; i++) {
            const calendarDay = productionCalendar?.[i];

            const startDate = calendarDay?.startDate;
            const endDate = calendarDay?.endDate;

            if (startDate && (endDate || endDate === null)) {
              const start = dayjs(startDate);
              const end = endDate === null ? null : dayjs(endDate);

              if (
                (cellDate.isSame(start, "day") || cellDate.isAfter(start, "date")) &&
                end === null
              ) {
                if (calendarDay.months.month === cellDate.month() + 1) {
                  if (calendarDay.months.days.includes(cellDay)) {
                    return true;
                  }
                }
              } else if (start && end) {
                if (
                  (start?.isBefore(cellDate, "day") ||
                    (start?.isSame(cellDate, "day") && start.diff(end, "hour") > 1)) &&
                  (end?.isAfter(cellDate, "day") || end?.isSame(cellDate, "day"))
                ) {
                  if (calendarDay?.months?.days?.includes(cellDay)) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }

      return isWeekend;
    }, [dayValue, isWeekend, productionCalendar]);

    useEffect(() => {
      // if (dateColToCopy === )
      if (dayValue && dateRegex.test(dayValue)) {
        if (dayValue === dateColToCopy) {
          setCopyValue((prev) => ({
            ...prev,
            isWeekend: isInnerWeekend,
            value: prev?.value?.length
              ? [
                  ...prev?.value,
                  {
                    dates: value,
                    isDisabled: isDisabled,
                    employeeId: employeeId
                  }
                ]
              : [
                  {
                    dates: value,
                    isDisabled: isDisabled,
                    employeeId: employeeId
                  }
                ]
          }));
        }

        // const cellDate = dayjs(parseDate(dayValue));
        // // console.log(cellDate.format(''));
        // console.log(dayValue, dateColToCopy);
        // setCopyValue(prev => ({
        //   ...prev,
        //   isWeekend: isInnerWeekend,
        // value: [...prev?.value, {
        //   // dates: value
        //   dates: value,
        // }]
        // }))
      }
    }, [dateColToCopy]);

    useEffect(() => {
      if (!isDisabled && copyValue && dayValue && dateRegex.test(dayValue)) {
        if (dayValue === dateColToPaste) {
          const foundElemenet = copyValue.value.find((el) => el.employeeId === employeeId);
          handleChange(dayValue, foundElemenet?.dates);
          setDateColToPaste?.(undefined);
        }
      }
    }, [dateColToPaste]);

    return (
      <div
        tabIndex={-1}
        className={clsx(
          className && className,
          "min-w-12 flex-1  border-r-[1px]  flex items-center justify-center text-center z-20  max-w-12 border-gray-400",
          isInnerWeekend && "bg-gray-300",
          fieldType === "input" && "",
          (isDisabled || !allowedToMaster || isNotAllowed) &&
            "bg-slate-100 opacity-50  cursor-not-allowed",
          fieldType === "location" && "shadow-right-custom"
        )}>
        {fieldType === "index" ? (
          <>{index}</>
        ) : (
          <>
            {isLast ? (
              <>
                {headerCellType === "worker" ? (
                  <div className="flex flex-col h-full w-full">
                    {totalVariant === "numbers" ? (
                      <>
                        {allowableHours?.map((el) => (
                          <div
                            className="border-b-[1px] flex items-center justify-center"
                            style={{ height: `${heightPercentage}%` }}>
                            Итого: {el}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="h-full">
                        {cellLetters
                          ?.filter((cell) => cell.value !== "Я")
                          ?.map((el) => (
                            <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                              {el.value}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {headerCellType === "info" ? (
                      <Indentificators />
                    ) : (
                      <>
                        {headerCellType === "field" && typeof value === "object" ? (
                          <div className="flex flex-col w-full h-full">
                            {totalVariant === "numbers" ? (
                              <>
                                {allowedFields?.map((fld) => (
                                  <div
                                    className=" w-full flex items-center justify-center border-b-[1px]"
                                    style={{ height: `${heightPercentage}%` }}>
                                    {value[`${fld}`]}
                                  </div>
                                ))}
                              </>
                            ) : (
                              <>
                                {totalLettersSum && (
                                  <>
                                    <div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.П}
                                      </div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.Б}
                                      </div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.В}
                                      </div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.О}
                                      </div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.МО}
                                      </div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.А}
                                      </div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.К}
                                      </div>
                                      <div className="border-b-[1px]  min-h-8 flex items-center justify-center">
                                        {totalLettersSum?.М}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
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
                  <div className="overflow-hidden text-sm text-ellipsis text-nowrap ">
                    {errorMsg}
                  </div>
                ) : (
                  <>
                    {fieldType === "text" ? (
                      <>{label}</>
                    ) : fieldType === "info" ? (
                      <Indentificators facilitySettings={facilitySettings} />
                    ) : fieldType === "employee" ? (
                      <div
                        className=" h-full w-full flex items-center justify-center"
                        onClick={() => setModalOpen(true)}>
                        <div>{userShortName ?? ""}</div>
                      </div>
                    ) : fieldType === "position" ? (
                      <div>{userPosition}</div>
                    ) : fieldType === "location" ? (
                      <>
                        <div
                          className={clsx(
                            "flex flex-row items-center gap-1",
                            !lastIsOutOfTown ? "text-gray-200" : "text-green-500"
                          )}>
                          <Icon name="CheckMark" size={20} />
                        </div>
                      </>
                    ) : (
                      <CellInput
                        value={value}
                        handleChange={handleChange}
                        field={dayValue}
                        date={cellParsedDate}
                        isDisabled={isDisabled || !allowedToMaster || isNotAllowed}
                        facilitySettings={facilitySettings}
                        isWeekend={isInnerWeekend}
                        integers={integers}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        <Modal title="Редактирование сотрудника" state={isModalOpen} setState={setModalOpen}>
          <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(handleUpdate)}>
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
              render={({ field }) => (
                <Checkbox label="Вахтовик" {...field} checked={getValues("isOutOfTown")} />
              )}
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
              <Button htmlType="submit" loading={isSubmiting}>
                Сохранить
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }
);
