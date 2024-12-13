import { useEffect, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { Popconfirm, Tooltip } from "antd";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { apiRequests } from "~src/shared/api/requests";
import { regexes } from "~src/shared/constants/default";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { defaultQueryKeys, refetchQuery, useGetAllRoles } from "~src/shared/hooks/useRequests";
import { CreateEmployeeType, usersEmployeeType } from "~src/shared/types/user";
import { Button } from "~src/shared/ui/button/button";
import { Icon } from "~src/shared/ui/icon/icon";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";

export const ActionsRenderer = (params: CustomCellRendererProps<usersEmployeeType>) => {
  const userData = params?.data;
  const { userRole } = useGetUser();

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const [isSubmiting, setSubmiting] = useState<boolean>(false);
  const [isDeleting, setDeleting] = useState<boolean>(false);

  const { data: allRoles, isLoading: isRolesLoading } = useGetAllRoles(isModalOpen);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateEmployeeType>({
    defaultValues: {
      login: userData?.login,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      middleName: userData?.middleName,
      phoneNumber: userData?.phoneNumber,
      role_id: userData?.role?.id ?? null,
      password: ""
    }
  });

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  const handleUpdate = async (data: CreateEmployeeType) => {
    setSubmiting(true);
    await apiRequests
      .updateUser(data, userData?.id)
      .then(() => {
        toast.success("Сотрудник успешно обновлен");
        refetchQuery(defaultQueryKeys.allEmployess);
        setModalOpen(false);
      })
      .finally(() => {
        setSubmiting(false);
      });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await apiRequests
      .deleteEmployee(params?.data?.id)
      .then(() => {
        toast.success("Пользователь успешно удален");
        refetchQuery(defaultQueryKeys.allEmployess);
      })
      .finally(() => {
        setDeleting(false);
      });
  };

  return (
    <>
      <div className="flex flex-row items-center gap-2">
        <Tooltip placement="top" title="Редактировать">
          <Icon
            name="Edit"
            onClick={() => setModalOpen(true)}
            size={32}
            className="cursor-pointer text-blue-500 hover:text-red-500 transition-colors min-h-[41px]"
          />
        </Tooltip>
        {userRole === "admin" && (
          <Popconfirm
            placement="top"
            title="Удалить?"
            okText="Удалить"
            cancelText="Отменить"
            onConfirm={handleDelete}>
            <Icon
              name="Delete"
              size={26}
              className="cursor-pointer text-blue-500 hover:text-red-500 transition-colors min-h-[41px]"
            />
          </Popconfirm>
        )}
      </div>

      <Modal title="Редактирование сотрудника" state={isModalOpen} setState={setModalOpen}>
        <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(handleUpdate)}>
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
                isPhone
                label="Номер телефона"
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
                  loading={isRolesLoading}
                  label="Роль"
                  errorMessage={errors?.role_id?.message}
                  options={allRoles?.data
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
            render={({ field }) => {
              return (
                <Input
                  label="Новый пароль"
                  isPassword
                  errorMessage={errors?.password?.message}
                  {...field}
                />
              );
            }}
          />

          <div className="flex justify-center mt-4">
            <Button htmlType="submit" loading={isSubmiting}>
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
