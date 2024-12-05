import { FC } from "react";

import { Tooltip } from "antd";
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
    <div className="relative h-full flex items-center justify-center flex-col">
      <Tooltip
        placement="right"
        title="При клике на серую галочку происходит отборка данных по местным сотрудникам, а при клике на зеленую — отборка по вахтовикам.">
        <Icon name="Filters" size={20} className="absolute top-2" />
      </Tooltip>
      <Tooltip title="Вахтовики" placement="right" className="mt-8">
        <div
          className={clsx(
            "flex flex-row items-center gap-1 text-green-500 cursor-pointer p-2",
            selectedFilter === "red" ? "bg-gray-300 rounded-full shadow-xl " : ""
          )}
          onClick={() => {
            onSelect(selectedFilter === "red" ? null : "red");
          }}>
          <Icon name="CheckMark" size={20} />
        </div>
      </Tooltip>
      <Tooltip title="Местные" placement="right">
        <div
          className={clsx(
            "flex flex-row items-center gap-1 text-gray-200 cursor-pointer p-2",
            selectedFilter === "green" ? "bg-gray-300 rounded-full shadow-xl " : ""
          )}
          onClick={() => {
            onSelect(selectedFilter === "green" ? null : "green");
          }}>
          <Icon name="CheckMark" size={20} />
        </div>
      </Tooltip>
    </div>
  );
};
