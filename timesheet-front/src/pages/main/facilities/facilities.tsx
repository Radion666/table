import { useEffect, useState } from "react";

import { Pagination } from "antd";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { facilitiesColumns } from "./utils/constants";

import { GridTable } from "~src/components/grid-table/grid-table";
import { Loader } from "~src/components/loader/loader";
import { apiRequests } from "~src/shared/api/requests";
import { usePagination } from "~src/shared/hooks";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { useGetAllFacilities, useGetAllMasters } from "~src/shared/hooks/useRequests";
import { createFacilityWithMasterType } from "~src/shared/types/facilities";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { getUserFio } from "~src/shared/utils/default";

export const FacilitiesPage = () => {
  const { user } = useGetUser();

  const { currentPage, onChange, onShowSizeChange, pageSize, setTotalPage, totalPage } =
    usePagination();

  const { data, isFetching, refetch } = useGetAllFacilities({
    page: currentPage,
    pageSize: pageSize
  });

  useEffect(() => {
    if (data?.data?.totalPage) {
      setTotalPage(data?.data?.totalPage);
    }
  }, [data?.data]);

  const { data: masterData, isFetching: isMastersFetching } = useGetAllMasters();

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm<createFacilityWithMasterType>({
    defaultValues: {
      facilityName: "",
      masters: []
    }
  });

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const [isBtnLoading, setBtnLoading] = useState<boolean>(false);

  const handleCreateFacilitiy = async (data: createFacilityWithMasterType) => {
    const facilityName = data?.facilityName;
    const selectedMasters = data?.masters;
    if (!facilityName) {
      return toast.error("Необходимо заполнить наименование");
    }
    setBtnLoading(true);
    apiRequests
      .createFacility(facilityName)
      .then(async (res) => {
        const data = res.data;

        const masters = selectedMasters.map((masterId) => +masterId);

        if (data.id && masters?.length) {
          await apiRequests
            .updateMasterFacility({
              facility_id: data?.id,
              master_id: selectedMasters.map((masterId) => +masterId)
            })
            .then(() => {
              setModalOpen(false);
              reset();
              toast.success("Объект был создан");
              refetch();
            });
        } else {
          reset();
          setModalOpen(false);
          toast.success("Объект был создан");
          refetch();
        }
      })
      .finally(() => {
        setBtnLoading(false);
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
        {user?.role?.name !== "master" && (
          <div className="flex justify-end">
            <Button onClick={() => setModalOpen(true)}>Создать новый объект</Button>
          </div>
        )}

        {data?.data && (
          <>
            <GridTable
              rowData={data?.data?.items}
              columns={facilitiesColumns}
              defaultColDefParams={{
                sortable: true
              }}
            />
            <Pagination
              onChange={onChange}
              current={currentPage}
              // showSizeChanger
              onShowSizeChange={onShowSizeChange}
              showTotal={(total, range) => `${range[0]}-${range[1]} из ${total} элементов`}
              total={data?.data?.totalItems}
              pageSize={pageSize}
              align="center"
            />
          </>
        )}
      </div>
      <Modal title="Создание объекта" state={isModalOpen} setState={setModalOpen}>
        <form className="flex flex-col gap-2 mt-4" onSubmit={handleSubmit(handleCreateFacilitiy)}>
          <Controller
            control={control}
            name="facilityName"
            rules={{
              required: "Необходимо написать название объекта"
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
                  options={masterData?.data?.map((master) => ({
                    label: getUserFio(master),
                    value: master.id
                  }))}
                />
              );
            }}
          />

          <Button loading={isBtnLoading} htmlType="submit" className="mt-4">
            Сохранить
          </Button>
        </form>
      </Modal>
    </>
  );
};
