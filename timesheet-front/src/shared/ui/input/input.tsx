import { FC } from "react";

import { Input as AntdInput, InputProps as AntdInputProps } from "antd";
import { MaskedInput } from "antd-mask-input";
import clsx from "clsx";

interface InputProps extends AntdInputProps {
  isPassword?: boolean;
  label?: string;
  errorMessage?: string;
  isPhone?: boolean;
}

export const Input: FC<InputProps> = ({ isPassword, label, errorMessage, isPhone, ...props }) => {
  const InputComponent = isPassword ? AntdInput.Password : AntdInput;

  return (
    <div>
      {label && <div className="text-sm text-gray-700">{label}</div>}
      {isPhone ? (
        //@ts-ignore
        <MaskedInput
          mask={"+70000000000"}
          {...props}
          className={clsx("w-full h-10", props.className && props.className)}
        />
      ) : (
        <InputComponent
          {...props}
          className={clsx("w-full h-10", props.className && props.className)}
        />
      )}

      <div className="mt-[1px]  text-red-500 h-1 text-sm text-center">{errorMessage ?? ""}</div>
    </div>
  );
};
