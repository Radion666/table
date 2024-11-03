import { FC, memo } from "react";

import clsx from "clsx";

import { facilityTimesheetSettingType } from "~src/shared/types/facilities";

interface TotalHeaderRendererProps {
  facilityTimesheetSetting?: facilityTimesheetSettingType;
}

export const TotalHeaderRenderer: FC<TotalHeaderRendererProps> = memo(
  ({ facilityTimesheetSetting }) => {
    const integers = facilityTimesheetSetting?.integers;
    const getAllowedFields = () => {
      const fields = [];

      if (integers?.allowOnlyTotal) {
        return ["Итого часов"];
      }

      if (integers?.allowDay) {
        fields.push("Итого часов");
        fields.push("дневные");
      }
      if (integers?.allowNight) {
        fields.push("ночные");
      }
      if (integers?.allowOverwork) {
        fields.push(["перв. 2 ч", "более 2 ч"]);
      }

      return fields.length > 0 ? fields : [];
    };
    const allowedFields = getAllowedFields();
    const numberOfAllowedFields = allowedFields.length;

    const heightPercentage = numberOfAllowedFields === 1 ? 100 : 100 / numberOfAllowedFields;

    return (
      <div className="h-full w-full flex flex-row">
        <div className="w-[100px] border-r-[1px] h-full">
          {allowedFields?.map((field) => (
            <div
              className="border-b-[1px] flex items-center justify-center overflow-hidden "
              style={{
                height: `${heightPercentage}%`
              }}>
              {Array.isArray(field) ? (
                <div
                  className={clsx(
                    "flex flex-row w-full h-full",
                    Array.isArray(field) ? "visible" : "hidden"
                  )}
                  style={{
                    height: "100%"
                  }}>
                  {!!Array.isArray(field) &&
                    field?.map((fld) => (
                      <div className="w-full  text-center  border-r-[1px] p-1 flex items-center justify-center">
                        {fld}
                      </div>
                    ))}
                </div>
              ) : (
                <div>{field}</div>
              )}
            </div>
          ))}
          {/* <div className="border-b-[1px] h-1/4">Итого часов</div>
          <div className="border-b-[1px] h-1/4">дневные</div>
          <div className="border-b-[1px] h-1/4">ночные</div>
          <div className="flex justify-between h-1/4">
            <div className="w-1/2 border-r-[1px]">перв. 2 ч</div>
            <div className="w-1/2">более 2 ч</div>
          </div> */}
        </div>
        <div className="w-[64px] border-r-[1px] flex items-center justify-center">Итого смен</div>
        <div className="w-[64px] border-r-[1px] flex items-center justify-center">
          Итого часов (вых)
        </div>
        <div className="w-[64px] flex items-center justify-center">Итого смен (вых)</div>
      </div>
    );
  }
);
