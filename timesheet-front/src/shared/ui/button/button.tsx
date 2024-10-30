import { FC } from "react";

import { Button as AntdButton, ButtonProps as AntdButtonProps } from "antd";
import { clsx } from "clsx";

interface ButtonProps extends AntdButtonProps {}

export const Button: FC<ButtonProps> = ({ ...props }) => {
  return (
    <AntdButton
      type="primary"
      {...props}
      className={clsx("md:w-52 h-10", props.className && props.className)}
    />
  );
};
