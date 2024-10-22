import { FC } from "react";

import { Checkbox as AntdCheckbox, CheckboxProps as AntdCheckboxProps } from "antd";
import { clsx } from "clsx";

interface CheckboxProps extends AntdCheckboxProps {
  label: string;
  containerClassName?: string;
}

export const Checkbox: FC<CheckboxProps> = ({ label, containerClassName, ...props }) => {
  return (
    <div className={clsx("flex items-center gap-3 mb-2", containerClassName && containerClassName)}>
      <AntdCheckbox {...props} />
      {label && <div className="text-sm text-gray-700">{label}</div>}
    </div>
  );
};
