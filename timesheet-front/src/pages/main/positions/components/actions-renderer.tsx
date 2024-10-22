import { useEffect, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { queryClient } from "~src/app/App";
import { apiRequests } from "~src/shared/api/requests";
import { positionType } from "~src/shared/types/positions";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";

export const ActionsRenderer = (params: CustomCellRendererProps<positionType>) => {
  const position = params?.data;

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm<Pick<positionType, "name">>({
    defaultValues: {
      name: position?.name ?? ""
    }
  });

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  const updatePosition = async (data: Pick<positionType, "name">) => {
    const positionName = data.name;

    if (!positionName) return toast.error("Необходимо заполнить значение");

    if (positionName === position?.name) {
      return toast.error("Нельзя сохранить старое значение");
    }

    if (position?.id) {
      apiRequests
        .updatePosition({
          id: position?.id,
          name: positionName
        })
        .then(() => {
          toast.success("Успешно обновлено");
          queryClient.refetchQueries({
            queryKey: ["all positions"]
          });
          setModalOpen(false);
        });
    }
  };

  return (
    <>
      <div>
        <Button className="max-h-8" onClick={() => setModalOpen(true)}>
          Изменить наименование
        </Button>
      </div>
      <Modal title="Изменение должности" state={isModalOpen} setState={setModalOpen}>
        <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(updatePosition)}>
          <Controller
            name="name"
            control={control}
            rules={{
              required: "Необходимо заполнить наименование должности"
            }}
            render={({ field }) => {
              return (
                <Input
                  errorMessage={errors?.name?.message}
                  label="Новое наименование должности"
                  {...field}
                />
              );
            }}
          />

          <Button htmlType="submit" color="primary" className="ml-auto mr-auto">
            Сохранить
          </Button>
        </form>
      </Modal>
    </>
  );
};
