import { FC, useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";
import dayjs, { Dayjs } from "dayjs";

import { dateValueType } from "../../../data";

import { useGetUser } from "~src/shared/hooks/useGetUser";
import { facilityTimesheetSettingType } from "~src/shared/types/facilities";
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
}

const cellLetters = [
  {
    label: "Я - Явка",
    value: "Я"
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
    label: "А - Административный",
    value: "А"
  }
];

export const CellInput: FC<CellInputProps> = ({
  value,
  handleChange,
  field,
  date,
  isDisabled,
  facilitySettings
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

  useEffect(() => {
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
  }, [value]);

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
                handleChange(field, "delete");
              }}
            />
          )}
          {typeof value === "object" &&
            Object?.keys?.(value)?.map((key) => {
              return (
                <input
                  className="w-[95%] rounded-md ml-auto mr-auto  border-[1px] text-center hover:border-blue-200"
                  value={value[key]}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (value === "") {
                      return handleChange(field, "", key);
                    }

                    const regex = /^[0-8]?$/;
                    const overworkRegex = /^(0|[1-9]|1[0-2])$/;
                    const totalRegex = /^(0|[1-9]|1[0-9]|2[0-4])$/;

                    let isValid = false;

                    if (integers?.allowOnlyTotal) {
                      isValid = totalRegex.test(value);
                    } else if (
                      integers?.allowDay &&
                      integers?.allowNight &&
                      integers?.allowOverwork
                    ) {
                      isValid = regex.test(value);
                    } else if (
                      (integers?.allowDay && integers?.allowNight) ||
                      (integers?.allowNight && integers?.allowOverwork) ||
                      (integers?.allowDay && integers?.allowOverwork)
                    ) {
                      isValid = overworkRegex.test(value);
                    } else {
                      isValid = totalRegex.test(value);
                    }

                    if (isValid) {
                      handleChange(field, value, key);
                    }
                  }}
                  style={{
                    height: `${100 / Object.keys(value).length}%`
                  }}
                />
              );
            })}
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
