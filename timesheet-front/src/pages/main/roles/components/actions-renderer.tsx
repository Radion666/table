import { useEffect, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { queryClient } from "~src/app/App";
import { apiRequests } from "~src/shared/api/requests";
import { roleType } from "~src/shared/types/roles";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";

export const ActionsCellRenderer = (params: CustomCellRendererProps<roleType>) => {
  const role = params.data;

  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const [isSubmiting, setSubmiting] = useState<boolean>(false);

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm<{ roleName: string }>({
    defaultValues: {
      roleName: role?.alt_name ?? ""
    }
  });

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  const updateRole = async (data: { roleName: string }) => {
    const roleName = data.roleName;

    if (!roleName) return toast.error("Необходимо заполнить значение");

    if (roleName === role?.alt_name) {
      return toast.error("Нельзя сохранить старое значение");
    }
    setSubmiting(true);

    if (role?.id) {
      apiRequests
        .updateRole(role.id, roleName)
        .then(() => {
          toast.success("Успешно обновлено");
          queryClient.refetchQueries({
            queryKey: ["all roles"]
          });
          setModalOpen(false);
        })
        .finally(() => {
          setSubmiting(false);
        });
    }
  };

  return (
    <>
      <div>
        <Button className=" max-h-8" onClick={() => setModalOpen(true)}>
          Изменить наименование
        </Button>
      </div>
      <Modal title="Изменение роли" state={isModalOpen} setState={setModalOpen}>
        <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(updateRole)}>
          <Controller
            name="roleName"
            control={control}
            rules={{
              required: "Необходимо заполнить поле"
            }}
            render={({ field }) => {
              return (
                <Input
                  errorMessage={errors?.roleName?.message}
                  label="Новое наименование роли"
                  {...field}
                />
              );
            }}
          />

          <Button
            loading={isSubmiting}
            htmlType="submit"
            color="primary"
            className="ml-auto mr-auto">
            Сохранить
          </Button>
        </form>
      </Modal>
    </>
  );
};
