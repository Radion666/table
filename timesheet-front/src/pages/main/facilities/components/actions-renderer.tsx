import { memo, useEffect, useMemo, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { queryClient } from "~src/app/App";
import { apiRequests } from "~src/shared/api/requests";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { useGetAllMasters } from "~src/shared/hooks/useRequests";
import { createFacilityWithMasterType, facilitiyType } from "~src/shared/types/facilities";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { getUserFio } from "~src/shared/utils/default";

export const ActionsRenderer = memo((params: CustomCellRendererProps<facilitiyType>) => {
  const { user, userRole } = useGetUser();

  const masters = params?.data?.masterFactories;
  const mastersIds = useMemo(() => {
    return masters?.map((master) => master.master_id) ?? [];
  }, [masters]);

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const {
    control,
    reset,
    formState: { errors },
    handleSubmit
  } = useForm<createFacilityWithMasterType>({
    defaultValues: {
      facilityName: params?.data?.name ?? "",
      masters: mastersIds
    }
  });

  const { data: mastersData, isFetching: isMastersFetching } = useGetAllMasters();

  useEffect(() => {
    reset();
  }, [isModalOpen]);

  const handleUpdate = async (data: createFacilityWithMasterType) => {
    if (!params?.data) return;

    const facilityName = data.facilityName;
    const selectedMasters = data.masters;

    if (!facilityName) {
      return toast.error("Необходимо заполнить наименование объека");
    }
    await apiRequests
      .updateFacilityName({
        id: +params?.data?.id,
        newName: facilityName,
        mastersIds: selectedMasters.map((masterId) => +masterId)
      })
      .then(() => {
        setModalOpen(false);

        queryClient.refetchQueries({
          queryKey: ["all facilities"]
        });
      });
  };

  const navigate = useNavigate();

  return (
    <>
      <div className="flex flex-row items-center gap-5 justify-start h-[44px]">
        {userRole !== "master" && (
          <Button className="max-h-8 w-36" color="primary" onClick={() => setModalOpen(true)}>
            Изменить объект
          </Button>
        )}
        <a
          href={`/timesheet/${params?.data?.id}`}
          target="_blank"
          onClick={(e) => {
            e.preventDefault();

            navigate(`/timesheet/${params?.data?.id}`);
          }}>
          <Button className="max-h-8 w-36" type="dashed" onClick={() => setModalOpen(true)}>
            Табель по объекту
          </Button>
        </a>
      </div>
      {userRole !== "master" && (
        <Modal title="Редактирование объекта" state={isModalOpen} setState={setModalOpen}>
          <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(handleUpdate)}>
            <Controller
              control={control}
              name="facilityName"
              rules={{
                required: "Необходимо заполнить наименование"
              }}
              render={({ field }) => {
                return (
                  <Input
                    errorMessage={errors?.facilityName?.message}
                    label="Наименование объекта"
                    {...field}
                  />
                );
              }}
            />

            <Controller
              control={control}
              name="masters"
              render={({ field }) => {
                return (
                  <Select
                    label="Мастер"
                    loading={isMastersFetching}
                    mode="multiple"
                    {...field}
                    options={mastersData?.data?.map((master) => ({
                      label: getUserFio(master),
                      value: master.id
                    }))}
                  />
                );
              }}
            />

            <Button htmlType="submit" className="mt-4">
              Сохранить
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
});
