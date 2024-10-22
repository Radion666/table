import { memo } from "react";

export const TotalHeaderRenderer = memo(() => {
  return (
    <div className="h-full w-full flex flex-row">
      <div className="w-[200px] border-r-[1px] h-full">
        <div className="border-b-[1px] h-1/4">Итого часов</div>
        <div className="border-b-[1px] h-1/4">дневные</div>
        <div className="border-b-[1px] h-1/4">ночные</div>
        <div className="flex justify-between h-1/4">
          <div className="w-1/2 border-r-[1px]">перв. 2 ч</div>
          <div className="w-1/2">более 2 ч</div>
        </div>
      </div>
      <div className="w-[64px] border-r-[1px]">Итого смен</div>
      <div className="w-[64px] border-r-[1px]">Итого часов (вых)</div>
      <div className="w-[64px]">Итого смен (вых)</div>
    </div>
  );
});
