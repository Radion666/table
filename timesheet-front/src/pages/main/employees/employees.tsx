import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";

import { employeesColumns } from "./utils/constants";

import { GridTable } from "~src/components/grid-table/grid-table";
import { Loader } from "~src/components/loader/loader";
import { apiRequests } from "~src/shared/api/requests";
import { regexes } from "~src/shared/constants/default";
import { useGetAllEmployees } from "~src/shared/hooks/useRequests";
import { CreateEmployeeType } from "~src/shared/types/user";
import { Button } from "~src/shared/ui/button/button";
import { Icon } from "~src/shared/ui/icon/icon";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";

export const EmployeesPage = () => {
  const { data, isFetching, refetch } = useGetAllEmployees();
  const [isSubmiting, setSubmiting] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateEmployeeType>({
    defaultValues: {
      birthDate: "",
      firstName: "",
      lastName: "",
      login: "",
      middleName: "",
      phoneNumber: "",
      role_id: null,
      password: ""
    }
  });

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  const { data: roles, isFetching: isRolesFetching } = useQuery({
    queryKey: ["all roles"],
    queryFn: () => apiRequests.getRoles(),
    enabled: isModalOpen
  });

  const onSubmit = async (data: CreateEmployeeType) => {
    setSubmiting(true);
    await apiRequests
      .createEmployee({
        ...data
      })
      .then(() => {
        setModalOpen(false);
        refetch();
      })
      .finally(() => {
        setSubmiting(false);
      });
  };

  if (isFetching) {
    return <Loader />;
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 justify-center p-5">
        <div className="flex justify-end">
          <Icon
            onClick={() => setModalOpen(true)}
            name="Create"
            width={30}
            height={30}
            className="cursor-pointer hover:text-blue-700"
          />
        </div>
        <GridTable
          rowData={data?.data ?? []}
          columns={employeesColumns}
          defaultColDefParams={{
            sortable: true
          }}
        />
      </div>
      <Modal title="Создание нового сотрудника" state={isModalOpen} setState={setModalOpen}>
        <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(onSubmit)}>
          <Controller
            control={control}
            name="login"
            rules={{
              required: "Логин обязателен"
            }}
            render={({ field }) => (
              <Input errorMessage={errors?.login?.message} label="Логин" {...field} />
            )}
          />

          <Controller
            control={control}
            rules={{
              required: "Фамилия обязательна"
            }}
            name="lastName"
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

          {/* <Controller
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
          /> */}
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
                label="Номер телефона"
                isPhone
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="role_id"
            rules={{
              required: "Необходимо выбрать роль"
            }}
            render={({ field }) => {
              return (
                <Select
                  loading={isRolesFetching}
                  label="Роль"
                  errorMessage={errors?.role_id?.message}
                  options={roles?.data
                    ?.filter((role) => role.name !== "worker")
                    .map((role) => ({
                      label: role.alt_name,
                      value: role.id
                    }))}
                  {...field}
                />
              );
            }}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: "Необходимо заполнить пароль"
            }}
            render={({ field }) => {
              return (
                <Input
                  label="Пароль"
                  isPassword
                  errorMessage={errors?.password?.message}
                  {...field}
                />
              );
            }}
          />

          <div className="flex justify-center mt-4">
            <Button loading={isSubmiting} htmlType="submit">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
