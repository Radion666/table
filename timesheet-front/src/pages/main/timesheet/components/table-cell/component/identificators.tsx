import { FC, memo } from "react";

import { facilityTimesheetSettingType } from "~src/shared/types/facilities";

interface IndentificatorsProps {
  facilitySettings?: facilityTimesheetSettingType;
}

export const Indentificators: FC<IndentificatorsProps> = memo(({ facilitySettings }) => {
  const integers = facilitySettings?.integers;

  const getAllowableHours = () => {
    const result = [];

    if (integers?.allowOnlyTotal) {
      return ["Часы"];
    }

    if (integers?.allowDay) {
      result.push("Д");
    }
    if (integers?.allowNight) {
      result.push("Н");
    }
    if (integers?.allowOverwork) {
      result.push("П");
    }

    return result.length > 0 ? result : [];
  };

  const allowableHours = getAllowableHours();
  const numberOfHours = allowableHours.length;

  const heightPercentage = numberOfHours === 1 ? 100 : 100 / numberOfHours;
  return (
    <div className="h-full w-full">
      {allowableHours.map((hour, index) => (
        <div
          key={index}
          className={`flex items-center border-b-[1px] w-full justify-center `}
          style={{ height: `${heightPercentage}%` }}>
          {hour}
        </div>
      ))}
    </div>
  );
});
