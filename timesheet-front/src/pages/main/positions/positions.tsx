import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { positionsColumns } from "./utils/constants";

import { queryClient } from "~src/app/App";
import { GridTable } from "~src/components/grid-table/grid-table";
import { Loader } from "~src/components/loader/loader";
import { apiRequests } from "~src/shared/api/requests";
import { useGetAllFacilities } from "~src/shared/hooks/useRequests";
import { positionType } from "~src/shared/types/positions";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";

export const PositionsPage = () => {
  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const { isFetching, data: positionsData } = useQuery({
    queryKey: ["all positions"],
    queryFn: () => apiRequests.getAllPositions()
  });
  const { data: allFacilities, isLoading: isFacilitiesLoading } = useGetAllFacilities({
    page: 1,
    pageSize: 100000
  });

  const [isSending, setSending] = useState<boolean>(false);

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm<Pick<positionType, "name" | "facilities">>({
    defaultValues: {
      name: "",
      facilities: []
    }
  });

  const createPosition = async (data: Pick<positionType, "name" | "facilities">) => {
    const positionName = data.name;

    if (!positionName) return toast.error("Необходимо заполнить значение");

    setSending(true);
    apiRequests
      .createPosition({
        name: positionName,
        facilities: data.facilities
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
          <Button onClick={() => setModalOpen(true)}>Создать новую должность</Button>
        </div>
        <GridTable
          rowData={positionsData?.data ?? []}
          columns={positionsColumns}
          defaultColDefParams={{
            sortable: true
          }}
        />
      </div>
      <Modal title="Создание должности" state={isModalOpen} setState={setModalOpen}>
        <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(createPosition)}>
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
                  label="Наименование должности"
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
                  {...field}
                  options={allFacilities?.data?.items?.map((facility) => ({
                    label: facility.name,
                    value: facility.id
                  }))}
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
