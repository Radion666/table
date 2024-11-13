import { FC } from "react";

import clsx from "clsx";

import { Icon } from "~src/shared/ui/icon/icon";

interface tableLocationHeaderProps {
  positionColumn: boolean;
  onSelect: (type: "red" | "green" | null) => void;
  selectedFilter: "red" | "green" | null;
}

export const TableLocationHeader: FC<tableLocationHeaderProps> = ({
  positionColumn,
  onSelect,
  selectedFilter
}) => {
  return (
    <div>
      <div
        className={clsx(
          "flex flex-row items-center gap-1 text-green-500 cursor-pointer p-2",
          selectedFilter === "green" ? "bg-gray-300 rounded-full shadow-xl " : ""
        )}
        onClick={() => {
          onSelect(selectedFilter === "green" ? null : "green");
        }}>
        <Icon name="House" size={20} />
      </div>
      <div
        className={clsx(
          "flex flex-row items-center gap-1 text-red-800 cursor-pointer p-2",
          selectedFilter === "red" ? "bg-gray-300 rounded-full shadow-xl " : ""
        )}
        onClick={() => {
          onSelect(selectedFilter === "red" ? null : "red");
        }}>
        <Icon name="House" size={20} />
      </div>
    </div>
  );
};
