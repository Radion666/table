export const removeLeadingZeroFromDate = (date: string) => {
  return date?.startsWith("0") ? date.slice(1) : date;
};

export const getUserFio = (user?: any) => {
  if (!user) return "";
  return `${user?.lastName ?? ""} ${user?.firstName ?? ""} ${user?.middleName ?? ""} `;
};

export const getShortUserFio = (user: any) => {
  if (!user) return "";

  return `${user?.lastName ?? ""} ${user?.firstName?.charAt(0) + "."} ${
    user?.middleName?.charAt(0) ?? ""
  }`;
};

export const convertToDateArray = (
  year?: number,
  monthDays?: { month: number; days: number[] }[]
): string[] => {
  const dateArray: string[] = [];

  if (year && monthDays?.length) {
    if (monthDays?.length) {
      monthDays?.forEach(({ month, days }) => {
        days?.forEach((day) => {
          // Формируем строку даты в формате YYYY-MM-DD
          const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
            2,
            "0"
          )}`;
          dateArray.push(dateString);
        });
      });
    }
  }

  return dateArray;
};
