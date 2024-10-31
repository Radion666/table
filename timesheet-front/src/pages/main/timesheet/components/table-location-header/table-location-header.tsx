import { Icon } from "~src/shared/ui/icon/icon";

export const TableLocationHeader = () => {
  return (
    <div>
      <div className="flex flex-row items-center gap-1">
        <Icon name="House" size={20} color="green" />
        (0)
      </div>
      <div className="flex flex-row items-center gap-1">
        <Icon name="House" size={20} color="red" />
        (1)
      </div>
    </div>
  );
};
