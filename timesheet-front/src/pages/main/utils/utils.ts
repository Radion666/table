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

export const getDaysInMonth = (value: number, isRestircted: boolean = false) => {
  const daysInMonth: daysInMonth[] = [];
  const startOfMonth = dayjs().add(value, "month").startOf("month");
  const endOfMonth = dayjs().add(value, "month").endOf("month");

  if (isRestircted) {
    const today = dayjs();
    const yesterday = today.subtract(1, "day");
    const dayBeforeYesterday = today.subtract(2, "day");

    const relevantDays = [today, yesterday, dayBeforeYesterday].filter((day) =>
      day.isSame(startOfMonth, "month")
    );

    for (const day of relevantDays) {
      daysInMonth.push({
        date: day.format("DD.MM.YYYY"),
        isWeekend: day.day() === 0 || day.day() === 6,
        dayName: daysOfWeekShort[day.format("dddd").toLowerCase()]
      });
    }
    daysInMonth.reverse();
  } else {
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
