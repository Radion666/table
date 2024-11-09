import { Icon } from "~src/shared/ui/icon/icon";

export const TableLocationHeader = () => {
  return (
    <div>
      <div className="flex flex-row items-center gap-1 text-green-500">
        <Icon name="House" size={20} />
      </div>
      <div className="flex flex-row items-center gap-1 text-red-800">
        <Icon name="House" size={20} />
      </div>
    </div>
  );
};
