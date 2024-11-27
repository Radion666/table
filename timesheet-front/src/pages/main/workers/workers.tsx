import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useDebounceValue } from "usehooks-ts";

import { workersColumns, workersStatuses } from "./utils/constants";

import { GridTable } from "~src/components/grid-table/grid-table";
import { apiRequests } from "~src/shared/api/requests";
import { regexes } from "~src/shared/constants/default";
import { useAppSelector } from "~src/shared/hooks";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { useGetAllFacilities, useGetAllWorkers } from "~src/shared/hooks/useRequests";
import { createWorkerType, workerStatusType } from "~src/shared/types/employees";
import { Button } from "~src/shared/ui/button/button";
import { Checkbox } from "~src/shared/ui/checkbox/checkbox";
import { CustomDatePicker } from "~src/shared/ui/custom-datepicker/custom-datepicker";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { getUserFio } from "~src/shared/utils/default";

export const WorkersPage = () => {
  const { userRole } = useGetUser();

  const { user } = useAppSelector((state) => state.userReducer);

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const [searchName, setSearchName] = useState<string>("");
  const [debouncedSearchName] = useDebounceValue(searchName, 500);
  const [selectedStatus, setSelectedStatus] = useState<workerStatusType>("working");

  const {
    data: workersData,
    isFetching,
    isLoading,
    refetch
  } = useGetAllWorkers({
    searchName: debouncedSearchName,
    status: selectedStatus
  });
  // const { data: positionsData, isFetching: isPositionsFetching } = useGetAllPositions();
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
      facilityId: null,
      firstName: "",
      isOutOfTown: true,
      lastName: "",
      masterId: userRole === "master" ? user?.id : null,
      middleName: "",
      phoneNumber: "",
      positionId: null,
      registeredAddress: "",
      status: "working",
      createdAt: null
    }
  });

  useEffect(() => {
    setValue("masterId", null);
    setValue("positionId", null);
  }, [watch("facilityId")]);

  const { data: allMastersData, isLoading: isAllMastersLoading } = useQuery({
    queryKey: ["all masters", getValues("facilityId")],
    queryFn: () => apiRequests.getEmployees("master", getValues("facilityId") ?? undefined),
    enabled: userRole !== "master" && !!watch("facilityId")
  });

  const { data: positionsData, isFetching: isPositionsFetching } = useQuery({
    queryKey: ["facility by id", watch("facilityId")],
    queryFn: () => apiRequests.getPositionsByFacilityId(getValues("facilityId") ?? undefined),
    enabled: typeof getValues("facilityId") === "number"
  });

  const handleCreate = async (data: createWorkerType) => {
    await apiRequests
      .createWorker({
        ...data,
        createdById: user?.id as number,
        isOutOfTown: !data?.isOutOfTown,
        createdAt: data?.createdAt ? dayjs(data?.createdAt).format() : null
      })
      .then(() => {
        toast.success("Сотрудник успешно создан");
        refetch();
        setModalOpen(false);
      });
  };

  const today = dayjs();
  const firstDayOfCurrentMonth = dayjs().startOf("month");
  // Функция для отключения дней после сегодняшнего дня и до 1 числа месяца
  const disabledDate = (current) => {
    // Заблокировать все дни после сегодняшнего дня и до первого числа месяца
    return current.isAfter(today, "day") || current.isBefore(firstDayOfCurrentMonth, "day");
  };

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 justify-center p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-row items-center gap-5 flex-1 flex-wrap">
            <Input
              label="Поиск по ФИО"
              className="md:w-96"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e);
              }}
              label="Фильтрация по статусу"
              className="md:w-96"
              options={[
                {
                  label: "Работает",
                  value: "working"
                },
                {
                  label: "Уволен",
                  value: "fired"
                },
                {
                  label: "Архив",
                  value: "archived"
                }
              ]}
            />
          </div>

          <Button onClick={() => setModalOpen(true)}>Создать нового сотрудника</Button>
        </div>

        <GridTable
          rowData={workersData?.data ?? []}
          columns={workersColumns}
          defaultColDefParams={{
            sortable: true
          }}
          gridProps={{
            loading: isFetching
          }}
        />
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
            control={control}
            name="facilityId"
            render={({ field }) => (
              <Select
                optionFilterProp="label"
                loading={isAllFacilitiesFetching}
                options={allFacilities?.data?.items?.map((facility) => ({
                  value: facility.id,
                  label: facility.name
                }))}
                showSearch
                errorMessage={errors?.facilityId?.message}
                label="Объект"
                {...field}
              />
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
            rules={{
              required: ""
            }}
            control={control}
            name="createdAt"
            render={({ field }) => (
              <CustomDatePicker
                label="Дата трудоустройства"
                disabledDate={disabledDate}
                {...field}
              />
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
            <Button htmlType="submit">Сохранить</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
