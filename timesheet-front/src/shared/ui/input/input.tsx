import { FC } from "react";

import { Input as AntdInput, InputProps as AntdInputProps } from "antd";
import clsx from "clsx";

interface InputProps extends AntdInputProps {
  isPassword?: boolean;
  label?: string;
  errorMessage?: string;
}

export const Input: FC<InputProps> = ({ isPassword, label, errorMessage, ...props }) => {
  const InputComponent = isPassword ? AntdInput.Password : AntdInput;

  return (
    <div>
      {label && <div className="text-sm text-gray-700">{label}</div>}
      <InputComponent
        {...props}
        className={clsx("w-full h-10", props.className && props.className)}
      />
      <div className="mt-[1px]  text-red-500 h-1 text-sm text-center">{errorMessage ?? ""}</div>
    </div>
  );
};
