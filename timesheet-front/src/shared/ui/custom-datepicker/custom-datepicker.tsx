import { FC } from "react";

import { DatePicker, DatePickerProps } from "antd";
import ruRU from "antd/es/locale/ru_RU";
import clsx from "clsx";
import dayjs from "dayjs";
import "dayjs/locale/ru"; // Импортируем локаль для dayjs

dayjs.locale("ru");

interface CustomDatePickerProps extends DatePickerProps {
  label?: string;
  errorMessage?: string;
}

export const CustomDatePicker: FC<CustomDatePickerProps> = ({ label, errorMessage, ...props }) => {
  return (
    <div>
      {label && <div className="text-sm text-gray-700">{label}</div>}
      <DatePicker
        {...props}
        className={clsx("w-full min-h-10 max-h-10", props.className && props.className)}
        locale={{ lang: ruRU }}
      />

      <div className="mt-[1px]  text-red-500 h-1 text-sm text-center">{errorMessage ?? ""}</div>
    </div>
  );
};
