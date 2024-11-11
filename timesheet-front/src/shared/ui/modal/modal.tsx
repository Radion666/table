import { Dispatch, FC, SetStateAction } from "react";

import { Modal as AntdModal, ModalProps as AntdModalProps } from "antd";

interface ModalProps extends AntdModalProps {
  state: boolean;
  setState: Dispatch<SetStateAction<boolean>>;
  onCancel?: () => void;
}

export const Modal: FC<ModalProps> = ({ state, setState, onCancel, ...props }) => {
  const handleOk = () => {
    setState(false);
  };

  const handleCancel = () => {
    setState(false);
    onCancel?.();
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
