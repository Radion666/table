import { FC, useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";
import dayjs, { Dayjs } from "dayjs";

import { dateValueType } from "../../../data";

import { useGetUser } from "~src/shared/hooks/useGetUser";
import {
  facilityTimesheetSettingType,
  worksheetTableFacilitySettingIntegersType
} from "~src/shared/types/facilities";
import { Button } from "~src/shared/ui/button/button";
import { Icon } from "~src/shared/ui/icon/icon";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";

interface CellInputProps {
  value: dateValueType;
  handleChange: (field: string, value: dateValueType, type?: string) => void;
  field: string;
  date?: Dayjs;
  isDisabled?: boolean;
  facilitySettings?: facilityTimesheetSettingType;
  isWeekend: boolean;
  integers?: worksheetTableFacilitySettingIntegersType;
}

export const cellLetters = [
  {
    label: "Я - Явка",
    value: "Я"
  },
  {
    label: "П - Прогул",
    value: "П"
  },
  {
    label: "Б - Больничный",
    value: "Б"
  },
  {
    label: "В - Выходной",
    value: "В"
  },
  {
    label: "О - Отпуск",
    value: "О"
  },
  {
    label: "МО - Межвахтовый отпуск",
    value: "МО"
  },
  {
    label: "А - Административный",
    value: "А"
  },
  {
    label: "К - Командировочный",
    value: "К"
  },
  {
    label: "М - Материнский день",
    value: "М"
  }
];

export const CellInput: FC<CellInputProps> = ({
  value,
  handleChange,
  field,
  date,
  isDisabled,
  facilitySettings,
  isWeekend
}) => {
  const { userRole } = useGetUser();

  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const isFirstRender = useRef<boolean>(true);

  const allowedDates = useMemo(() => {
    const today = dayjs();
    return [
      today.format("YYYY-MM-DD"),
      today.subtract(1, "day").format("YYYY-MM-DD"),
      today.subtract(2, "day").format("YYYY-MM-DD")
    ];
  }, []);

  const [selectedValue, setSelectedValue] = useState<string>("");
  const [prevSelectedValue, setPrevSelectedValue] = useState<dateValueType | null>(null);
  const [borderColor, setBorderColor] = useState<string>("");

  useEffect(() => {
    if (typeof value === "string") {
      setSelectedValue(value);
    }
  }, [value, isModalOpen]);

  useEffect(() => {
    if (date && isFirstRender.current) {
      const cellDateDay = date.format("YYYY-MM-DD");
      if (!allowedDates.includes(cellDateDay)) {
        setPrevSelectedValue(value);
      }
      isFirstRender.current = false;
    }
  }, [value]);

  const handleUpdatePrev = (value: any) => {
    if (value && prevSelectedValue) {
      if (date && JSON.stringify(value) !== JSON.stringify(prevSelectedValue)) {
        const cellDateDay = date.format("YYYY-MM-DD");
        if (!allowedDates.includes(cellDateDay)) {
          if (typeof prevSelectedValue === "object" && typeof value === "object") {
            setBorderColor("border-yellow-300");
          } else {
            setBorderColor("border-red-500");
          }
        }
        isFirstRender.current = false;
      } else if (JSON.stringify(value) === JSON.stringify(prevSelectedValue)) {
        setBorderColor("");
      }
    } else {
      setBorderColor("");
    }
  };

  const integers = facilitySettings?.integers;

  return (
    <>
      {typeof value === "string" ? (
        <div
          className={clsx(
            "w-full h-full select-none relative",
            borderColor ? `border-[2px] border-solid ${borderColor}` : "border-none"
          )}
          tabIndex={-1}>
          {value && userRole !== "financier" && (
            <Icon
              name="Cross"
              size={20}
              className="absolute top-0 right-[-2px] bg-white rounded-full shadow-md cursor-pointer z-20 hover:bg-gray-200"
              onClick={() => {
                handleUpdatePrev("");
                handleChange(field, "delete");
              }}
            />
          )}
          <button
            className={clsx(
              "w-full h-full hover:bg-blue-200 hover:bg-opacity-20 transition-all",
              isDisabled && "cursor-not-allowed opacity-75"
            )}
            onClick={() => {
              if (isDisabled) return;
              setModalOpen(true);
            }}>
            {value}
          </button>
        </div>
      ) : (
        <div
          onMouseEnter={(e) => e.stopPropagation()}
          className={clsx(
            "h-full flex flex-col relative",
            borderColor ? `border-[2px] border-solid ${borderColor}` : "border-none",
            isDisabled && "cursor-not-allowed opacity-75"
          )}>
          {value && userRole !== "financier" && (
            <Icon
              name="Cross"
              size={20}
              className="absolute top-0 right-[-2px] bg-white rounded-full shadow-md cursor-pointer z-20 hover:bg-gray-200"
              onClick={() => {
                if (isDisabled) return;
                handleUpdatePrev("");
                handleChange(field, "delete");
              }}
            />
          )}
          {typeof value === "object" && isWeekend && integers?.allowOverwork ? (
            <input
              className={clsx(
                "w-[95%] rounded-md ml-auto mr-auto  border-[1px] text-center hover:border-blue-200",
                isDisabled && "cursor-not-allowed opacity-75"
              )}
              value={value?.overwork}
              onChange={(e) => {
                const value = e.target.value;

                if (value === "") {
                  handleUpdatePrev("");

                  return handleChange(field, "", "overwork");
                }

                const regex = /^(?:0|0\.5|[1-9](?:\.5)?|1[0-9](?:\.5)?|2[0-4](?:\.5)?)$/;
                const isPrevValueIsDot =
                  value[value?.length - 1] === "." &&
                  value[value?.length - 2] !== "." &&
                  +value < 24;

                const isValid = isPrevValueIsDot ? true : regex.test(value);

                if (isValid && +value <= 24) {
                  handleUpdatePrev(value);

                  handleChange(field, value, "overwork");
                }
              }}
              style={{
                height: `100%`
              }}
            />
          ) : (
            !!value &&
            Object?.keys?.(value)?.map((key) => {
              return (
                <input
                  className={clsx(
                    "w-[95%] rounded-md ml-auto mr-auto  border-[1px] text-center hover:border-blue-200",
                    isDisabled && "cursor-not-allowed opacity-75 pointer-events-none"
                  )}
                  value={value[key]}
                  onChange={(e) => {
                    if (isDisabled) return;
                    const value = e.target.value;

                    if (value === "") {
                      handleUpdatePrev("");

                      return handleChange(field, "", key);
                    }

                    const regex = /^(?:0|[1-8](?:\.5)?|0?\.[5])$/;
                    const overworkRegex = /^(?:0|[1-9](?:\.5)?|1[0-2](?:\.5)?)$/;
                    const totalRegex = /^(?:0|0\.5|[1-9](?:\.5)?|1[0-9](?:\.5)?|2[0-4](?:\.5)?)$/;
                    let isValid = false;

                    if (integers?.allowOnlyTotal) {
                      const isPrevValueIsDot =
                        value[value?.length - 1] === "." &&
                        value[value?.length - 2] !== "." &&
                        +value < 24;

                      isValid = isPrevValueIsDot ? true : totalRegex.test(value);
                    } else if (
                      integers?.allowDay &&
                      integers?.allowNight &&
                      integers?.allowOverwork
                    ) {
                      const isPrevValueIsDot =
                        value[value?.length - 1] === "." &&
                        value[value?.length - 2] !== "." &&
                        +value < 8;

                      isValid = isPrevValueIsDot ? true : regex.test(value);
                    } else if (
                      (integers?.allowDay && integers?.allowNight) ||
                      (integers?.allowNight && integers?.allowOverwork) ||
                      (integers?.allowDay && integers?.allowOverwork)
                    ) {
                      const isPrevValueIsDot =
                        value[value?.length - 1] === "." &&
                        value[value?.length - 2] !== "." &&
                        +value < 12;
                      isValid = isPrevValueIsDot ? true : overworkRegex.test(value);
                    } else {
                      const isPrevValueIsDot =
                        value[value?.length - 1] === "." &&
                        value[value?.length - 2] !== "." &&
                        +value < 24;

                      isValid = isPrevValueIsDot ? true : totalRegex.test(value);
                    }

                    if (isValid) {
                      handleUpdatePrev(value);

                      handleChange(field, value, key);
                    }
                  }}
                  style={{
                    height: `${100 / Object.keys(value).length}%`
                  }}
                />
              );
            })
          )}
        </div>
      )}
      {isModalOpen && (
        <Modal title="Выберите тип" state={isModalOpen} setState={setModalOpen}>
          <div className="w-full flex flex-col ">
            <Select
              value={selectedValue}
              onChange={(e) => {
                setSelectedValue(e);
              }}
              options={cellLetters.map((letter) => ({
                value: letter.value,
                label: letter.label
              }))}
            />

            <Button
              className="ml-auto mr-auto"
              onClick={() => {
                handleUpdatePrev(selectedValue);

                handleChange(field, selectedValue);
                setModalOpen(false);
              }}>
              Сохранить
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};
