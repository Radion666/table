import { FC, useEffect, useState } from "react";

import { dateValueType } from "../../../data";

import { Button } from "~src/shared/ui/button/button";
import { Modal } from "~src/shared/ui/modal/modal";
import { Select } from "~src/shared/ui/select/select";

interface CellInputProps {
  value: dateValueType;
  handleChange: (field: string, value: dateValueType, type?: string) => void;
  field: string;
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
  },
  {
    label: "Удалить значение",
    value: "delete"
  }
];

export const CellInput: FC<CellInputProps> = ({ value, handleChange, field }) => {
  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  const [selectedValue, setSelectedValue] = useState<string>("");
  const [prevSelectedValue, setPrevSelectedValue] = useState<string>("");

  useEffect(() => {
    if (typeof value === "string") {
      setSelectedValue(value);
    }
  }, [value, isModalOpen]);

  return (
    <>
      {typeof value === "string" ? (
        <button
          onClick={() => setModalOpen(true)}
          className="w-full h-full select-none border-none"
          tabIndex={-1}>
          {value}
        </button>
      ) : (
        <div className="h-full flex flex-col">
          {typeof value === "object" &&
            Object?.keys?.(value)?.map((key) => {
              console.log(key);
              return (
                <input
                  className="w-[95%] rounded-md ml-auto mr-auto h-1/3 border-[1px] text-center hover:border-blue-200"
                  value={value[key]}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (value === "") {
                      return handleChange(field, "", key);
                    }

                    const regex = /^[0-8]?$/;
                    const overworkRegex = /^(0|[1-9]|1[0-2])$/;

                    if ((key === "overwork" ? overworkRegex : regex).test(value)) {
                      handleChange(field, value, key);
                    }
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
