import { useEffect, useState } from "react";

import { Calendar, Card, Col, DatePicker, Pagination, Row } from "antd";
import ruRU from "antd/es/locale/ru_RU";
import dayjs, { Dayjs } from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { workersStatuses } from "../workers/utils/constants";

import { facilitiesColumns } from "./utils/constants";

import "dayjs/locale/ru"; // Импортируем локаль для dayjs
import { GridTable } from "~src/components/grid-table/grid-table";
import { Loader } from "~src/components/loader/loader";
import { apiRequests } from "~src/shared/api/requests";
import { regexes } from "~src/shared/constants/default";
import { usePagination } from "~src/shared/hooks";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import {
  useGetAllFacilities,
  useGetAllMasters,
  useGetAllPositions,
  useGetProductionCalendar
} from "~src/shared/hooks/useRequests";
import { createWorkerType } from "~src/shared/types/employees";
import {
  createFacilityWithMasterType,
  worksheetTableFacilitySettingIntegersType
} from "~src/shared/types/facilities";
import { Button } from "~src/shared/ui/button/button";
import { Checkbox } from "~src/shared/ui/checkbox/checkbox";
import { Input } from "~src/shared/ui/input/input";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";
import { getUserFio } from "~src/shared/utils/default";

dayjs.locale("ru");

export const FacilitiesPage = () => {
  const { user, userRole } = useGetUser();

  const { currentPage, onChange, onShowSizeChange, pageSize, setTotalPage, totalPage } =
    usePagination();

  const { data, isFetching, refetch } = useGetAllFacilities({
    page: currentPage,
    pageSize: pageSize
  });

  const { data: productionCalendarData } = useGetProductionCalendar();

  const [windowWidth, setWindowWidth] = useState<number>();

  useEffect(() => {
    if (data?.data?.totalPage) {
      setTotalPage(data?.data?.totalPage);
    }
  }, [data?.data]);

  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
  ]);
  const [disabledDays, setDisabledDays] = useState<string[]>([]);

  const { data: masterData, isFetching: isMastersFetching } = useGetAllMasters();

  const [facilitySettings, setFacilitySettings] = useState<
    Pick<createFacilityWithMasterType, "settings">
  >({
    settings: {
      integers: {
        allowDay: true,
        allowNight: true,
        allowOverwork: true,
        allowOnlyTotal: false
      },
      letters: true
    }
  });

  const updateFacilitySettings = (
    key: keyof worksheetTableFacilitySettingIntegersType,
    value: boolean
  ) => {
    setFacilitySettings((prev) => ({
      settings: {
        ...prev.settings,
        integers: {
          ...prev?.settings?.integers,
          [key]: value,
          ...((key === "allowDay" || key === "allowNight" || key === "allowOverwork") &&
            value && {
              allowOnlyTotal: false
            }),
          ...(key === "allowOnlyTotal" &&
            value && {
              allowDay: false,
              allowNight: false,
              allowOverwork: false
            })
        }
      }
    }));
  };

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
  const [isCreateModalOpen, setCreateModalOpen] = useState<boolean>(false);

  const [isProductionCalendarVisible, setProductionCalendarVisible] = useState<boolean>(false);

  const [isBtnLoading, setBtnLoading] = useState<boolean>(false);

  const handleCreateFacilitiy = async (data: createFacilityWithMasterType) => {
    const facilityName = data?.facilityName;
    const selectedMasters = data?.masters;
    if (!facilityName) {
      return toast.error("Необходимо заполнить наименование");
    }
    setBtnLoading(true);

    apiRequests
      .createFacility({
        mastersIds: selectedMasters.map((masterId) => +masterId),
        name: facilityName,
        settings: facilitySettings.settings,
        workDays: selectedDaysOfWeek,
        notWorkingDays: disabledDays
      })
      .then(() => {
        setModalOpen(false);
        reset();
        setSelectedDaysOfWeek(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
        setDisabledDays([]);
        toast.success("Объект был создан");
        refetch();
      })
      .finally(() => {
        setBtnLoading(false);
      });
  };

  const {
    control: createWorkerControl,
    handleSubmit: createWorkerHandleSubmit,
    reset: createWorkerReset,
    formState: { errors: createWorkerErrors }
  } = useForm<createWorkerType>({
    defaultValues: {
      createdById: user?.id,
      actualAddress: "",
      facilityId: null,
      firstName: "",
      isOutOfTown: true,
      lastName: "",
      masterId: user?.id,
      middleName: "",
      phoneNumber: "",
      positionId: null,
      registeredAddress: "",
      status: "working"
    }
  });

  const { data: positionsData, isFetching: isPositionsFetching } = useGetAllPositions(
    userRole !== "financier"
  );
  const { data: allFacilities, isFetching: isAllFacilitiesFetching } = useGetAllFacilities({
    page: 1,
    pageSize: 1000
  });

  const handleCreate = async (data: createWorkerType) => {
    await apiRequests
      .createWorker({ ...data, createdById: user?.id as number, isOutOfTown: !data?.isOutOfTown })
      .then(() => {
        toast.success("Сотрудник успешно создан");
        refetch();
      })
      .finally(() => {
        setCreateModalOpen(false);
      });
  };

  useEffect(() => {
    reset();
    setSelectedDaysOfWeek(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    setDisabledDays([]);
  }, [isModalOpen]);

  useEffect(() => {
    const checkWidth = () => {
      setWindowWidth(window.innerWidth);
    };
    checkWidth();

    window.addEventListener("resize", checkWidth);

    return () => {
      window.removeEventListener("resize", checkWidth);
    };
  }, []);

  const navigate = useNavigate();

  if (isFetching) {
    return <Loader />;
  }

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

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 justify-center p-5 overflow-scroll">
        <div className="flex flex-row justify-end gap-5">
          <DatePicker
            onChange={(date) => {
              //@ts-ignore
              const formattedDate = date.format("MM-YYYY");

              apiRequests.downloadReportByFacilities(formattedDate).then(async (response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const a = document.createElement("a");
                a.href = url;
                a.download = "downloaded_file.xlsx";
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              });
            }}
            value={""}
            picker="month"
            locale={{
              lang: ruRU
            }}
            placeholder="Выберите месяц для скачивания отчета по объектам"
            className="min-w-[300px]"
          />
          {userRole !== "master" && userRole !== "financier" && (
            <div className="flex justify-end">
              <Button onClick={() => setModalOpen(true)}>Создать новый объект</Button>
            </div>
          )}
          {userRole === "master" && (
            <div className="flex justify-end">
              <Button onClick={() => setCreateModalOpen(true)}>Добавить сотрудника</Button>
            </div>
          )}
        </div>
        <>
          {(windowWidth ?? 1000) > 640 ? (
            <GridTable
              rowData={data?.data?.items ?? []}
              columns={facilitiesColumns}
              defaultColDefParams={{
                sortable: true
              }}
            />
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto h-full">
              {data?.data?.items?.map((item) => {
                const settings = item?.settings?.integers;

                const result = [];

                if (settings?.allowDay) {
                  result.push("День");
                }
                if (settings?.allowNight) {
                  result.push("Ночь");
                }
                if (settings?.allowOverwork) {
                  result.push("Переработка");
                }

                if (settings?.allowOnlyTotal) {
                  result.push("Общие значения");
                }

                return (
                  <div className="border-[1px] p-4 rounded-md flex justify-between items-center ">
                    <div className="max-w-[70%] ">
                      <div className="overflow-hidden text-ellipsis">{item.name}</div>
                      {!!result?.length && <span className="text-sm">{result.join(", ")}</span>}
                    </div>
                    <Button
                      onClick={() => {
                        navigate(`/timesheet/${item?.id}`);
                      }}>
                      Табель
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {data?.data?.totalPage > 1 && (
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
          )}
        </>
      </div>
      {isModalOpen && (
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
            <div>
              <div className="text-center font-medium ">Настройки в табеле</div>
              <div className="flex items-center mt-5 w-full justify-between">
                <div>
                  <Checkbox
                    checked={facilitySettings?.settings?.integers?.allowOnlyTotal}
                    label="Общее значение для ячейки"
                    onChange={(e) => {
                      updateFacilitySettings("allowOnlyTotal", e?.target?.checked);
                    }}
                  />
                </div>
                <div>
                  <div>
                    <Checkbox
                      label="День"
                      checked={facilitySettings?.settings?.integers?.allowDay}
                      onChange={(e) => {
                        updateFacilitySettings("allowDay", e?.target?.checked);
                      }}
                    />
                  </div>
                  <div>
                    <Checkbox
                      label="Ночь"
                      checked={facilitySettings?.settings?.integers?.allowNight}
                      onChange={(e) => {
                        updateFacilitySettings("allowNight", e?.target?.checked);
                      }}
                    />
                  </div>
                  <div>
                    <Checkbox
                      label="Переработки"
                      checked={facilitySettings?.settings?.integers?.allowOverwork}
                      onChange={(e) => {
                        updateFacilitySettings("allowOverwork", e?.target?.checked);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

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

            <Button loading={isBtnLoading} htmlType="submit" className="mt-4 ml-auto mr-auto">
              Сохранить
            </Button>
          </form>
        </Modal>
      )}
      {isCreateModalOpen && (
        <Modal
          title="Создание нового сотрудника"
          state={isCreateModalOpen}
          setState={setCreateModalOpen}>
          <form
            className="flex flex-col gap-2 mt-4"
            onSubmit={createWorkerHandleSubmit(handleCreate)}>
            <Controller
              control={createWorkerControl}
              name="lastName"
              rules={{
                required: "Фамилия обязательна"
              }}
              render={({ field }) => (
                <Input
                  errorMessage={createWorkerErrors?.lastName?.message}
                  label="Фамилия"
                  {...field}
                />
              )}
            />

            <Controller
              rules={{
                required: "Имя обязательно"
              }}
              control={createWorkerControl}
              name="firstName"
              render={({ field }) => (
                <Input
                  errorMessage={createWorkerErrors?.firstName?.message}
                  label="Имя"
                  {...field}
                />
              )}
            />

            <Controller
              rules={{
                required: "Отчество обязательно"
              }}
              control={createWorkerControl}
              name="middleName"
              render={({ field }) => (
                <Input
                  errorMessage={createWorkerErrors?.middleName?.message}
                  label="Отчество"
                  {...field}
                />
              )}
            />

            <Controller
              rules={{
                required: "Должность обязательна"
              }}
              control={createWorkerControl}
              name="positionId"
              render={({ field }) => (
                <Select
                  optionFilterProp="label"
                  options={positionsData?.data?.map((position) => ({
                    value: position.id,
                    label: position.name
                  }))}
                  showSearch
                  errorMessage={createWorkerErrors?.positionId?.message}
                  label="Должность"
                  {...field}
                />
              )}
            />

            <Controller
              control={createWorkerControl}
              name="facilityId"
              render={({ field }) => (
                <Select
                  optionFilterProp="label"
                  options={allFacilities?.data?.items?.map((facility) => ({
                    value: facility.id,
                    label: facility.name
                  }))}
                  showSearch
                  errorMessage={createWorkerErrors?.facilityId?.message}
                  label="Объект"
                  {...field}
                />
              )}
            />

            <Controller
              rules={{
                required: "Статус обязателен"
              }}
              control={createWorkerControl}
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
              control={createWorkerControl}
              name="phoneNumber"
              render={({ field }) => (
                <Input
                  errorMessage={createWorkerErrors.phoneNumber?.message}
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
              control={createWorkerControl}
              name="isOutOfTown"
              render={({ field }) => <Checkbox label="Местный" {...field} />}
            />

            <Controller
              control={createWorkerControl}
              name="registeredAddress"
              render={({ field }) => <Input label="Адрес регистрации" {...field} />}
            />
            <Controller
              control={createWorkerControl}
              name="actualAddress"
              render={({ field }) => <Input label="Адрес фактического проживания" {...field} />}
            />

            <div className="flex justify-center mt-4">
              <Button htmlType="submit">Сохранить</Button>
            </div>
          </form>
        </Modal>
      )}
      {isProductionCalendarVisible && (
        <Modal
          state={isProductionCalendarVisible}
          setState={setProductionCalendarVisible}
          width={"90%"}
          onCancel={() => {
            setDisabledDays([]);
          }}>
          <div className="text-center w-2/3 ml-auto mr-auto">
            Это модальное окно отображает производственный календарь с нерабочими днями. Если вы
            хотите сделать день рабочим, уберите его из календаря, сняв отметку о нерабочем статусе.
            Вы можете настроить календарь, добавив или убрав нерабочие дни в зависимости от ваших
            требований.
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
  );
};
