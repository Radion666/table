import { FC, memo } from "react";

import { employeeTotalType } from "../../data";

interface TotalCellRenderProps {
  employeeTotal: employeeTotalType;
}

export const TotalCellRenderer: FC<TotalCellRenderProps> = memo(({ employeeTotal }) => {
  return (
    <div className="h-full min-w-[395px] flex-1 flex flex-row border-r-[1px]">
      <div className="w-[200px] max-w-[200px] border-r-[1px] h-full">
        <div className="h-1/3 border-b-[1px] text-center flex items-center justify-center">
          {employeeTotal.hoursOfDay}
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
        </div>
      </div>
      <div className="w-[64px] flex items-center justify-center border-r-[1px]">
        {employeeTotal.countOfWorkDays}
      </div>
      <div className="w-[64px] flex items-center justify-center border-r-[1px]">
        {employeeTotal.hoursOfWeekendWorkDays}
      </div>
      <div className="w-[64px] flex items-center justify-center ">
        {employeeTotal.countOfWeekendWorkDays}
      </div>
    </div>
  );
});
