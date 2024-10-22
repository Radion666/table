import { Spin } from "antd";

export const Fallback = () => {
  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <Spin />
    </div>
  );
};
