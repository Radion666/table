import { Dispatch, FC, SetStateAction } from "react";

import { Modal as AntdModal, ModalProps as AntdModalProps } from "antd";

interface ModalProps extends AntdModalProps {
  state: boolean;
  setState: Dispatch<SetStateAction<boolean>>;
}

export const Modal: FC<ModalProps> = ({ state, setState, ...props }) => {
  const handleOk = () => {
    setState(false);
  };

  const handleCancel = () => {
    setState(false);
  };

  return (
    <AntdModal
      open={state}
      onOk={handleOk}
      onCancel={handleCancel}
      centered
      footer={() => {
        return <div></div>;
      }}
      {...props}
    />
  );
};
