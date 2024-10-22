import dayjs from 'dayjs';

export const parseDate = (dateString: string) => {
  const [day, month, year] = dateString.split('.').map(Number);

  const dateObject = new Date(Date.UTC(year, month - 1, day));

  return dateObject.toISOString();
};

const daysOfWeekShort = {
  sunday: 'Вс',
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
};

interface getDaysInMonthType {
  fullDate: string;
  date: number;
  dayName: string;
  isWeekend: boolean;
}

export const getDaysInMonth = (value: number): getDaysInMonthType[] => {
  const daysInMonth = [];
  const startOfMonth = dayjs().add(value, 'month').startOf('month');
  const endOfMonth = dayjs().add(value, 'month').endOf('month');
  const totalDays = endOfMonth.date();

  for (let i = 0; i < totalDays; i++) {
    const currentDay = startOfMonth.clone().add(i, 'day');
    const dayOfCurrentDay = currentDay.day();
    const dayName = String(
      daysOfWeekShort[currentDay.format('dddd').toLowerCase()],
    )?.toUpperCase();

    daysInMonth.push({
      fullDate: currentDay.format('DD.MM.YYYY'),
      date: currentDay.date(),
      dayName: dayName,
      isWeekend: dayOfCurrentDay === 0 || dayOfCurrentDay === 6,
    });
  }

  return daysInMonth;
};
