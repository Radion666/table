import { useEffect, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { queryClient } from "~src/app/App";
import { apiRequests } from "~src/shared/api/requests";
import { useGetAllFacilities } from "~src/shared/hooks/useRequests";
import { positionType } from "~src/shared/types/positions";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";

export const ActionsRenderer = (params: CustomCellRendererProps<positionType>) => {
  const position = params?.data;

  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const [isSending, setSending] = useState<boolean>(false);

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm<Pick<positionType, "name" | "facilities">>({
    defaultValues: {
      name: position?.name ?? "",
      facilities: position?.facilities?.map((el) => el.id)
    }
  });

  const { data: allFacilities, isLoading: isFacilitiesLoading } = useGetAllFacilities({
    page: 1,
    pageSize: 100000
  });

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  const updatePosition = async (data: Pick<positionType, "name" | "facilities">) => {
    const positionName = data.name;

    if (!positionName) return toast.error("Необходимо заполнить значение");

    if (position?.id) {
      setSending(true);

      apiRequests
        .updatePosition({
          id: position?.id,
          name: positionName,
          facilities: data?.facilities
        })
        .then(() => {
          toast.success("Успешно обновлено");
          queryClient.refetchQueries({
            queryKey: ["all positions"]
          });
          setModalOpen(false);
        })
        .finally(() => {
          setSending(false);
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

          <Controller
            control={control}
            name="facilities"
            render={({ field }) => {
              return (
                <Select
                  label="Объекты"
                  loading={isFacilitiesLoading}
                  mode="multiple"
                  options={allFacilities?.data?.items?.map((facility) => ({
                    label: facility.name,
                    value: facility.id
                  }))}
                  {...field}
                />
              );
            }}
          />

          <Button loading={isSending} htmlType="submit" color="primary" className="ml-auto mr-auto">
            Сохранить
          </Button>
        </form>
      </Modal>
    </>
  );
};
