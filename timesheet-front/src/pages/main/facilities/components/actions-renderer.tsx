import { memo, useEffect, useMemo, useState } from "react";

import { CustomCellRendererProps } from "ag-grid-react";
import { Calendar, Card, Col, Popconfirm, Row } from "antd";
import ruRU from "antd/es/locale/ru_RU";
import dayjs, { Dayjs } from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { queryClient } from "~src/app/App";
import { apiRequests } from "~src/shared/api/requests";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import {
  defaultQueryKeys,
  refetchQuery,
  useGetAllMasters,
  useGetProductionCalendar
} from "~src/shared/hooks/useRequests";
import { createFacilityWithMasterType, facilitiyType } from "~src/shared/types/facilities";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { convertToDateArray, getUserFio } from "~src/shared/utils/default";

import "dayjs/locale/ru"; // Импортируем локаль для dayjs
import { Icon } from "~src/shared/ui/icon/icon";
dayjs.locale("ru");

export const ActionsRenderer = memo((params: CustomCellRendererProps<facilitiyType>) => {
  const { user, userRole } = useGetUser();

  const masters = params?.data?.masterFactories;
  const mastersIds = useMemo(() => {
    return masters?.map((master) => master.master_id) ?? [];
  }, [masters]);

  const { data: productionCalendarData } = useGetProductionCalendar();

  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
  ]);
  const [disabledDays, setDisabledDays] = useState<string[]>([]);

  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const [isProductionCalendarVisible, setProductionCalendarVisible] = useState<boolean>(false);

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

  const actualData = params?.data?.productionCalendar?.[0];

  const disabledDates = useMemo(
    () => convertToDateArray(actualData?.months?.year, actualData?.months?.dates),
    [actualData?.months?.dates, actualData?.months?.year]
  );

  useEffect(() => {
    setDisabledDays(disabledDates);
    setSelectedDaysOfWeek(actualData?.workingDays ?? []);

    // setDisabledDays(params?.data?.productionCalendar?.[params?.data?.productionCalendar?.length - 1].months?.)
  }, [params?.data]);

  const { data: mastersData, isFetching: isMastersFetching } = useGetAllMasters();

  useEffect(() => {
    setDisabledDays(disabledDates);

    setSelectedDaysOfWeek(actualData?.workingDays ?? []);

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
        mastersIds: selectedMasters.map((masterId) => +masterId),
        notWorkingDays: disabledDays,
        workDays: selectedDaysOfWeek
      })
      .then(() => {
        setModalOpen(false);

        queryClient.refetchQueries({
          queryKey: ["all facilities"]
        });
      });
  };

  const navigate = useNavigate();

  const holidays = productionCalendarData?.data?.holidays;

  const dateCellRender = (value: Dayjs) => {
    const date = value.format("YYYY-MM-DD");

    // Проверяем, является ли число 5
    if (disabledDays?.includes(date)) {
      return (
        <div
          onClick={() => {
            setDisabledDays((prev) => {
              return prev?.filter((el) => el !== date);
            });
          }}
          className="rounded-full bg-blue-500 w-6 h-6 flex justify-center items-center text-white">
          {value.date()}
        </div>
      );
    }
    return (
      <div
        onClick={() => {
          setDisabledDays((prev) => {
            return [...prev, date];
          });
        }}>
        {value.date()}
      </div>
    ); // Для остальных дней возвращаем стандартный рендер
  };

  const renderCalendars = () => {
    const months = Array.from({ length: 12 }, (_, month) => (
      <Col span={4} key={month}>
        <Card
          title={dayjs().month(month).format("MMMM")}
          className="text-center min-w-[280px]"
          bordered={false}>
          <Calendar
            fullscreen={false}
            headerRender={() => <></>} // Отключаем заголовок календаря
            locale={{ lang: ruRU }} // Устанавливаем локаль для календаря
            value={dayjs().month(month)} // Устанавливаем месяц
            fullCellRender={dateCellRender} // Кастомизируем ячейки даты
          />
        </Card>
      </Col>
    ));

    return months;
  };

  const handleDelete = async () => {
    await apiRequests.deleteFacility(params?.data?.id).then(() => {
      toast.success("Объект успешно удален");
      refetchQuery(defaultQueryKeys.allFacilities);
    });
  };

  return (
    <>
      <div className="flex flex-row items-center gap-5 justify-start h-[44px]">
        {userRole !== "master" && userRole !== "financier" && (
          <Button className="max-h-8 max-w-32" color="primary" onClick={() => setModalOpen(true)}>
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
          <Button className="max-h-8 max-w-32" type="dashed" onClick={() => setModalOpen(true)}>
            Табель по объекту
          </Button>
        </a>
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

            <div>
              <div className="text-center font-medium ">Настройки производственного календаря</div>
              <div className="flex flex-row w-full justify-center items-center mt-4">
                <div>
                  {!!disabledDays?.length && (
                    <div className="text-center">Выбрано {disabledDays?.length} нерабочих дней</div>
                  )}
                  <Button onClick={() => setProductionCalendarVisible(true)} type="default">
                    Настроить календарь
                  </Button>
                </div>
              </div>
            </div>

            <Button htmlType="submit" className="mt-4 ml-auto mr-auto">
              Сохранить
            </Button>
          </form>
        </Modal>
      )}

      {userRole !== "master" && (
        <>
          {isProductionCalendarVisible && (
            <Modal
              state={isProductionCalendarVisible}
              setState={setProductionCalendarVisible}
              width={"90%"}
              onCancel={() => {
                setDisabledDays(disabledDates);
              }}>
              <div className="text-center w-2/3 ml-auto mr-auto">
                Это модальное окно отображает производственный календарь с нерабочими днями. Если вы
                хотите сделать день рабочим, уберите его из календаря, сняв отметку о нерабочем
                статусе. Вы можете настроить календарь, добавив или убрав нерабочие дни в
                зависимости от ваших требований.
              </div>
              <div className="min-w-full flex justify-between mt-2 mb-2 ">
                <Button
                  onClick={() => setDisabledDays(holidays ?? [])}
                  style={{
                    minWidth: 350
                  }}>
                  Использовать текущий производственный календарь РФ
                </Button>
                <div className="flex flex-row items-center gap-5">
                  <Button
                    onClick={() => {
                      const copyOfDisabledDays = structuredClone(disabledDays);
                      setTimeout(() => setDisabledDays(copyOfDisabledDays), 0);

                      setProductionCalendarVisible(false);
                    }}>
                    Сохранить
                  </Button>
                  <Button type="default" onClick={() => setDisabledDays([])}>
                    Сбросить
                  </Button>
                </div>
              </div>
              <Row gutter={[16, 16]}>
                {renderCalendars()} {/* Рендерим все 12 календарей */}
              </Row>
            </Modal>
          )}
        </>
      )}
    </>
  );
});
