import { useEffect, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { Timeline } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { workersStatuses, workerStatuses } from "../utils/constants";

import { apiRequests } from "~src/shared/api/requests";
import { regexes } from "~src/shared/constants/default";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import {
  defaultQueryKeys,
  refetchQuery,
  useGetAllFacilities,
  useGetAllMasters,
  useGetAllPositions
} from "~src/shared/hooks/useRequests";
import { actualWorkersResponseType, createWorkerType } from "~src/shared/types/employees";
import { Button } from "~src/shared/ui/button/button";
import { Checkbox } from "~src/shared/ui/checkbox/checkbox";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { getUserFio } from "~src/shared/utils/default";

export const ActionsRenderer = (params: CustomCellRendererProps<actualWorkersResponseType>) => {
  const { userRole } = useGetUser();
  const workerData = params.data;

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const [isHistoryModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historyModalType, setHistoryModalType] = useState<
    "status" | "master" | "facility" | "position" | "outOfTown" | null
  >(null);

  const { isFetching: isPositionsFetching, data: positionsData } = useGetAllPositions();
  const { data: allFacilities, isFetching: isAllFacilitiesFetching } = useGetAllFacilities({
    page: 1,
    pageSize: 1000
  });
  const { data: allMastersData, isLoading: isAllMastersLoading } = useGetAllMasters();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<Omit<createWorkerType, "createdById">>({
    defaultValues: {
      actualAddress: workerData?.actualAddress ?? "",
      facilityId: workerData?.facilityPeriods?.[0]?.facility?.id ?? null,
      firstName: workerData?.firstName ?? "",
      isOutOfTown: !workerData?.outOfTownPeriods?.[0]?.isOutOfTown,
      lastName: workerData?.lastName,
      masterId: workerData?.masterPeriods?.[0]?.user?.id ?? null,
      middleName: workerData?.middleName,
      phoneNumber: workerData?.phoneNumber,
      positionId: workerData?.positionPeriods?.[0]?.position?.id ?? null,
      registeredAddress: workerData?.registeredAddress,
      status: workerData?.employmentPeriods?.[0]?.status ?? undefined
    }
  });

  const handleUpdate = async (data: Omit<createWorkerType, "createdById">) => {
    await apiRequests
      .updateWorker({ ...data, isOutOfTown: !data?.isOutOfTown }, workerData?.id)
      .then(() => {
        toast.success("Сотрудник успешно создан");
        refetchQuery(defaultQueryKeys.allWorkers);
        setModalOpen(false);
      });
  };

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  return (
    <>
      <Button className="max-w-32 max-h-8" onClick={() => setModalOpen(true)}>
        Редактировать
      </Button>
      <Modal title="Создание нового сотрудника" state={isModalOpen} setState={setModalOpen}>
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
            rules={{
              required: "Отчество обязательно"
            }}
            control={control}
            name="middleName"
            render={({ field }) => (
              <Input errorMessage={errors?.middleName?.message} label="Отчество" {...field} />
            )}
          />
          <div className="flex flex-row items-center gap-5">
            <Controller
              rules={{
                required: "Должность обязательна"
              }}
              control={control}
              name="positionId"
              render={({ field }) => (
                <Select
                  containerClassName={clsx(
                    workerData?.positionPeriods?.length ? "w-5/6" : "w-full"
                  )}
                  optionFilterProp="label"
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
            {workerData?.positionPeriods?.length && (
              <Button
                className="h-7 w-1/6 mt-[13px]"
                onClick={() => {
                  setHistoryModalType("position");
                  setHistoryModalOpen(true);
                }}>
                История
              </Button>
            )}
          </div>
          <div className="flex flex-row items-center gap-5">
            <Controller
              control={control}
              name="facilityId"
              render={({ field }) => (
                <Select
                  containerClassName={clsx(
                    workerData?.facilityPeriods?.length ? "w-5/6" : "w-full"
                  )}
                  optionFilterProp="label"
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
            {workerData?.facilityPeriods?.length && (
              <Button
                className="h-7 w-1/6 mt-[13px]"
                onClick={() => {
                  setHistoryModalType("facility");
                  setHistoryModalOpen(true);
                }}>
                История
              </Button>
            )}
          </div>
          {userRole !== "master" && (
            <div className="flex flex-row items-center gap-5">
              <Controller
                control={control}
                name="masterId"
                render={({ field }) => (
                  <Select
                    optionFilterProp="label"
                    containerClassName={clsx(
                      workerData?.masterPeriods?.length ? "w-5/6" : "w-full"
                    )}
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
              {workerData?.masterPeriods?.length && (
                <Button
                  className="h-7 w-1/6 mt-[13px]"
                  onClick={() => {
                    setHistoryModalType("master");
                    setHistoryModalOpen(true);
                  }}>
                  История
                </Button>
              )}
            </div>
          )}
          <div className="flex flex-row items-center gap-5">
            <Controller
              rules={{
                required: "Статус обязателен"
              }}
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  containerClassName={clsx(
                    workerData?.employmentPeriods?.length ? "w-5/6" : "w-full"
                  )}
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
            {workerData?.employmentPeriods?.length && (
              <Button
                className="h-7 w-1/6 mt-[13px]"
                onClick={() => {
                  setHistoryModalType("status");
                  setHistoryModalOpen(true);
                }}>
                История
              </Button>
            )}
          </div>
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
                errorMessage={errors.phoneNumber?.message}
                placeholder="+71111111111 или 81111111111"
                label="Номер телефона"
                {...field}
              />
            )}
          />
          <div className="flex flex-row items-center">
            <Controller
              rules={{
                required: ""
              }}
              control={control}
              name="isOutOfTown"
              render={({ field }) => (
                <Checkbox
                  containerClassName="w-5/6"
                  label="Местный"
                  {...field}
                  checked={field.value}
                />
              )}
            />

            {workerData?.masterPeriods?.length && (
              <Button
                className="h-7 w-1/6"
                onClick={() => {
                  setHistoryModalType("outOfTown");
                  setHistoryModalOpen(true);
                }}>
                История
              </Button>
            )}
          </div>{" "}
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
      {isHistoryModalOpen && (
        <Modal
          title="История изменения статусов"
          state={isHistoryModalOpen}
          setState={setHistoryModalOpen}
          onClose={() => setHistoryModalType(null)}>
          <div className="flex h-full w-full justify-center items-center max-h-[500px] overflow-y-auto">
            <Timeline
              className="mt-5"
              items={
                historyModalType === "status"
                  ? workerData?.employmentPeriods?.map((period) => ({
                      children: `Статус изменился ${dayjs(period.createdAt)?.format(
                        "DD.MM.YYYY HH:mm"
                      )} на «${workerStatuses[period.status]}», действителен с ${dayjs(
                        period?.startDate
                      )?.format("DD.MM.YYYY HH:mm")} по ${
                        period?.endDate === null
                          ? "текущее время"
                          : `${dayjs(period?.endDate)?.format("DD.MM.YYYY HH:mm")}`
                      }`
                    }))
                  : historyModalType === "facility"
                  ? workerData?.facilityPeriods?.map((period) => ({
                      children: `Объект изменился ${dayjs(period.createdAt)?.format(
                        "DD.MM.YYYY HH:mm"
                      )} на «${period.facility?.name}», действителен с ${dayjs(
                        period?.startDate
                      )?.format("DD.MM.YYYY HH:mm")} по ${
                        period?.endDate === null
                          ? "текущее время"
                          : `${dayjs(period?.endDate)?.format("DD.MM.YYYY HH:mm")}`
                      }`
                    }))
                  : historyModalType === "master"
                  ? workerData?.masterPeriods?.map((period) => ({
                      children: `Мастер изменился ${dayjs(period.createdAt)?.format(
                        "DD.MM.YYYY HH:mm"
                      )} на «${getUserFio(period?.user)}», действителен с ${dayjs(
                        period?.startDate
                      )?.format("DD.MM.YYYY HH:mm")} по ${
                        period?.endDate === null
                          ? "текущее время"
                          : `${dayjs(period?.endDate)?.format("DD.MM.YYYY HH:mm")}`
                      }`
                    }))
                  : historyModalType === "outOfTown"
                  ? workerData?.outOfTownPeriods?.map((period) => ({
                      children: `Статус иногородности изменился ${dayjs(period.createdAt)?.format(
                        "DD.MM.YYYY HH:mm"
                      )} на «${
                        period?.isOutOfTown ? "Иногородний" : "Не иногородний"
                      }», действителен с ${dayjs(period?.startDate)?.format(
                        "DD.MM.YYYY HH:mm"
                      )} по ${
                        period?.endDate === null
                          ? "текущее время"
                          : `${dayjs(period?.endDate)?.format("DD.MM.YYYY HH:mm")}`
                      }`
                    }))
                  : historyModalType === "position"
                  ? workerData?.positionPeriods?.map((period) => ({
                      children: `Должность изменилась ${dayjs(period.createdAt)?.format(
                        "DD.MM.YYYY HH:mm"
                      )} на «${period?.position?.name}», действителен с ${dayjs(
                        period?.startDate
                      )?.format("DD.MM.YYYY HH:mm")} по ${
                        period?.endDate === null
                          ? "текущее время"
                          : `${dayjs(period?.endDate)?.format("DD.MM.YYYY HH:mm")}`
                      }`
                    }))
                  : []
              }
            />
          </div>
        </Modal>
      )}
    </>
  );
};
