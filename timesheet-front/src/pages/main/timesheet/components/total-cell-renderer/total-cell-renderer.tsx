import { FC, memo } from "react";

import { clsx } from "clsx";

import { employeeTotalType } from "../../data";
import { totalVariantType } from "../../timesheet";

import { facilityTimesheetSettingType } from "~src/shared/types/facilities";

interface TotalCellRenderProps {
  employeeTotal: employeeTotalType;
  facilityTimesheetSetting?: facilityTimesheetSettingType;
  totalVariant: totalVariantType;
  isLocal: boolean;
}

export const TotalCellRenderer: FC<TotalCellRenderProps> = memo(
  ({ employeeTotal, facilityTimesheetSetting, totalVariant, isLocal }) => {
    const integers = facilityTimesheetSetting?.integers;

    // hoursOfDay
    // hoursOfNight
    // hoursOfOverworkTwoHours
    // hoursOfOverworkMoreTwoHours

    const getAllowedFields = () => {
      const fields = [];

      if (integers?.allowOnlyTotal) {
        return ["hoursOfOnlyTotalHours"];
      }

      if (integers?.allowDay) {
        fields.push("hoursOfDay");
      }
      if (integers?.allowNight) {
        fields.push("hoursOfNight");
      }
      if (integers?.allowOverwork) {
        fields.push(["hoursOfOverworkTwoHours", "hoursOfOverworkMoreTwoHours"]);
      }

      return fields.length > 0 ? fields : [];
    };
    const allowedFields = getAllowedFields();
    const numberOfAllowedFields = allowedFields.length;

    const heightPercentage = numberOfAllowedFields === 1 ? 100 : 100 / numberOfAllowedFields;

    return (
      <div className="h-full sticky right-0 z-40 bg-white  min-w-[295px] flex-1 flex flex-row border-r-[1px] shadow-left-custom">
        {totalVariant === "numbers" ? (
          <>
            <div className="w-[100px] border-r-[1px] h-full">
              {allowedFields?.map((field) => (
                <div
                  className=" border-b-[1px] text-center flex   items-center justify-center"
                  style={{
                    height: `${heightPercentage}%`
                  }}>
                  {employeeTotal?.[field as any]}
                  <div
                    className={clsx(
                      "flex flex-row w-full h-full",
                      Array.isArray(field) ? "visible" : "hidden"
                    )}>
                    {!!Array.isArray(field) &&
                      field?.map((fld) => (
                        <div className="w-full  text-center  border-r-[1px] p-1 flex items-center justify-center">
                          {employeeTotal?.[fld]}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {/* <div className="h-1/3 border-b-[1px] text-center flex items-center justify-center">
            {employeeTotal.hourse}
          </div>
          <div className="h-1/3 border-b-[1px] text-center flex items-center justify-center">
            {employeeTotal.hoursOfNight}
          </div>
          <div className="h-1/3 flex ">
            <div className="w-1/2 text-right border-r-[1px] p-1 flex items-center justify-center">
              {employeeTotal.hoursOfOverworkTwoHours}
            </div>
            <div className="w-1/2 text-right p-1 flex items-center justify-center">
              {employeeTotal.hoursOfOverworkMoreTwoHours}
            </div>
          </div> */}
            </div>
            <div className="w-[64px] flex items-center justify-center border-r-[1px]">
              {employeeTotal.countOfWorkDays}
            </div>
            <div className="w-[64px] flex items-center justify-center border-r-[1px]">
              {employeeTotal.hoursOfWeekendWorkDays}
            </div>
            <div className="w-[64px] flex items-center justify-center ">
              {isLocal ? "-" : employeeTotal.countOfWeekendWorkDays}
            </div>
          </>
        ) : (
          <div className="flex flex-row justify-around w-full items-center">
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.П}
            </div>
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.Б}
            </div>
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.В}
            </div>
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.О}
            </div>
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.МО}
            </div>
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.А}
            </div>
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.К}
            </div>
            <div className="border-r-[1px] h-full  flex items-center justify-center w-full">
              {employeeTotal.lettersSum?.М}
            </div>
          </div>
        )}
      </div>
    );
  }
);
