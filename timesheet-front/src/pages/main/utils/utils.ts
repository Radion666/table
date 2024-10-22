import dayjs from "dayjs";

export interface daysInMonth {
  date: string;
  isWeekend: boolean;
  dayName: string;
}

const daysOfWeekShort = {
  sunday: "Вс",
  monday: "Пн",
  tuesday: "Вт",
  wednesday: "Ср",
  thursday: "Чт",
  friday: "Пт",
  saturday: "Сб"
};

export const getDaysInMonth = (value: number) => {
  const daysInMonth: daysInMonth[] = [];
  const startOfMonth = dayjs().add(value, "month").startOf("month");
  const endOfMonth = dayjs().add(value, "month").endOf("month");

  const totalDays = endOfMonth.date();

  for (let i = 0; i < totalDays; i++) {
    const currentDay = startOfMonth.clone().add(i, "day");
    const dayOfCurrentDay = currentDay.day();
    const dayName = currentDay.format("dddd");
    daysInMonth.push({
      date: currentDay.format("DD.MM.YYYY"),
      isWeekend: dayOfCurrentDay === 0 || dayOfCurrentDay === 6,
      dayName: daysOfWeekShort[dayName.toLowerCase()]
    });
  }

  return daysInMonth;
};

export const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(\d{4})$/;

export const parseDate = (dateString: string) => {
  if (!dateString && !dateRegex.test(dateString)) return;

  const [day, month, year] = dateString.split(".").map(Number);

  const dateObject = new Date(Date.UTC(year, month - 1, day));

  return dateObject.toISOString();
};
