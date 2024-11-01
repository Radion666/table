import { FC } from "react";

import { Select as AntdSelect, SelectProps as AntdSelectProps } from "antd";
import clsx from "clsx";

interface SelectProps extends AntdSelectProps {
  label?: string;
  errorMessage?: string;
  containerClassName?: string;
}

export const Select: FC<SelectProps> = ({ label, errorMessage, containerClassName, ...props }) => {
  return (
    <div className={clsx(containerClassName && containerClassName)}>
      {label && <div className="text-sm text-gray-700">{label}</div>}
      <AntdSelect
        {...props}
        className={clsx("w-full min-h-10", props.className && props.className)}
        notFoundContent={<NotFoundContent />}
      />
      <div className="mt-[1px] text-red-500 h-1 text-sm text-center">{errorMessage ?? ""}</div>
    </div>
  );
};

const NotFoundContent = () => {
  return <div className="text-center">Данные не найдены</div>;
};
