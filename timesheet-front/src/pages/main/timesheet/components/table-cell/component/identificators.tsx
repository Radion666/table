import { memo } from "react";

export const Indentificators = memo(() => {
  return (
    <div className="h-full w-full">
      {["д", "н", "п"].map((inf) => (
        <div className="h-1/3 flex items-center border-b-[1px] w-full justify-center">{inf}</div>
      ))}
    </div>
  );
});
