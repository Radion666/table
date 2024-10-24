import { useEffect, useState } from "react";

import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { workersColumns, workersStatuses } from "./utils/constants";

import { GridTable } from "~src/components/grid-table/grid-table";
import { Loader } from "~src/components/loader/loader";
import { apiRequests } from "~src/shared/api/requests";
import { regexes } from "~src/shared/constants/default";
import { useAppSelector } from "~src/shared/hooks";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import {
  useGetAllFacilities,
  useGetAllMasters,
  useGetAllPositions,
  useGetAllWorkers
} from "~src/shared/hooks/useRequests";
import { createWorkerType } from "~src/shared/types/employees";
import { Button } from "~src/shared/ui/button/button";
import { Checkbox } from "~src/shared/ui/checkbox/checkbox";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { getUserFio } from "~src/shared/utils/default";

export const WorkersPage = () => {
  const { userRole } = useGetUser();

  const { user } = useAppSelector((state) => state.userReducer);

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const { data: workersData, isFetching, refetch } = useGetAllWorkers();
  const { data: positionsData, isFetching: isPositionsFetching } = useGetAllPositions();
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
      status: "working"
    }
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

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  if (isFetching) {
    return <Loader />;
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 justify-center p-5">
        <div className="flex justify-end">
          <Button onClick={() => setModalOpen(true)}>Создать нового сотрудника</Button>
        </div>
        {workersData?.data && (
          <GridTable
            rowData={workersData?.data}
            columns={workersColumns}
            defaultColDefParams={{
              sortable: true
            }}
          />
        )}
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
            control={control}
            name="facilityId"
            render={({ field }) => (
              <Select
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

          {userRole !== "master" && (
            <Controller
              control={control}
              name="masterId"
              render={({ field }) => (
                <Select
                  optionFilterProp="label"
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
                errorMessage={errors.phoneNumber?.message}
                placeholder="+71111111111 или 81111111111"
                label="Номер телефона"
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
