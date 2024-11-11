import { BadRequestException } from '@nestjs/common';
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

export const isValidDateFormat = (date: string) => {
  const regex = /^(0?[1-9]|1[0-2])-(20\d{2})$/;
  return regex.test(date) && !/^0\d{1}-/.test(date);
};

export const checkForValidDate = (outterDate: string) => {
  const [_, month, year] = outterDate.split('.').map(Number);

  const date = `${month}-${year}`;

  if (!isValidDateFormat(date)) {
    throw new BadRequestException(
      'Переданная в параметрах дата имеет некорректный формат',
    );
  }
};

export const generateDateFromParams = (outterDate: string) => {
  const [_, month, year] = outterDate.split('.').map(Number);

  const date = `${month}-${year}`;

  return date;
};

export const checkForValidDateFromDate = (date: string) => {
  if (!isValidDateFormat(date)) {
    throw new BadRequestException(
      'Переданная в параметрах дата имеет некорректный формат',
    );
  }
};

export const validateParamsDate = (date: string) => {
  const regex = /^(0?[1-9]|1[0-2])-(20\d{2})$/;
  if (!regex.test(date) && !/^0\d{1}-/.test(date)) {
    throw new BadRequestException(
      'Переданная в параметрах дата имеет некорректный формат',
    );
  }
};

export const cleanData = (data, integers) => {
  const cleanedData = {};

  for (const date in data) {
    const entry = data[date];

    // Если entry равно null, просто оставляем его
    if (entry === null) {
      cleanedData[date] = null;
      continue;
    }

    if (typeof entry === 'string') {
      cleanedData[date] = entry;
      continue;
    }

    const { day, night, overwork } = entry;

    if (integers.allowOnlyTotal) {
      // Если allowOnlyTotal, удаляем day, night и overwork

      if (entry.total) {
        cleanedData[date] = {
          total: entry.total || null, // Оставляем только total
        };
      } else {
        continue;
      }
    } else {
      // Если allowDay, оставляем day
      if (integers.allowDay) {
        if (day) {
          cleanedData[date] = { day: day };
        }
      }

      // Если allowNight, оставляем night
      if (integers.allowNight) {
        if (night) {
          cleanedData[date] = {
            ...cleanedData[date],
            night: night || null,
          };
        }
      }

      // Если allowOverwork, оставляем overwork
      if (integers.allowOverwork) {
        if (overwork) {
          cleanedData[date] = {
            ...cleanedData[date],
            overwork: overwork || null,
          };
        }
      }

      // Если в cleanedData нет никаких полей, возвращаем null
      if (
        !cleanedData[date]?.day &&
        !cleanedData[date]?.night &&
        !cleanedData[date]?.overwork
      ) {
        cleanedData[date] = null;
      }
    }
  }

  return cleanedData;
};
export const transformDatesToMonthsArray = (
  dates: string[],
): productionDaysType => {
  if (dates?.length) {
    // Проверка, что все даты соответствуют формату 'YYYY-MM-DD' и имеют один и тот же год

    // Проверка, что все даты соответствуют формату 'YYYY-MM-DD' и имеют один и тот же год
    const yearSet = new Set<number>();
    const formattedDates = dates.map((dateStr) => {
      const date = new Date(dateStr);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(date.getTime())) {
        throw new Error(
          `Некорректная дата: ${dateStr}. Должен быть формат 'YYYY-MM-DD'.`,
        );
      }
      yearSet.add(date.getFullYear());
      return date;
    });

    if (yearSet.size > 1) {
      throw new Error('Все даты должны быть одного года.');
    }

    // Получаем год
    const year = formattedDates[0].getFullYear();

    // Группируем даты по месяцам
    const groupedByMonth = formattedDates.reduce(
      (acc, date) => {
        const month = date.getMonth() + 1; // Месяцы считаются с 0, добавляем 1
        const day = date.getDate();

        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(day);

        return acc;
      },
      {} as Record<number, number[]>,
    );

    // Преобразуем результат в нужный формат
    const result = {
      year,
      dates: Object.keys(groupedByMonth)
        .map((month) => ({
          month: parseInt(month),
          days: groupedByMonth[parseInt(month)].sort((a, b) => a - b),
        }))
        .sort((a, b) => a.month - b.month), // Сортируем по месяцам
    };

    return result;
  }
  return [] as any;
};

export interface productionDaysType {
  year: number;
  dates: { month: number; days: number[] }[];
}

export const validateWorkDays = (workDays: string[]) => {
  const validDays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  // Проверяем, что все дни в массиве на английском и не дублируются
  const seenDays = new Set<string>();

  for (const day of workDays) {
    if (!validDays.includes(day.toLowerCase())) {
      throw new BadRequestException(
        `Неверный день: ${day}. Рабочие дни должны быть одним из следующих: ${validDays.join(', ')}.`,
      );
    }

    // Проверяем на дублирование
    if (seenDays.has(day.toLowerCase())) {
      throw new BadRequestException(
        `Дублирующийся день: ${day}. Рабочие дни не могут содержать дубликаты.`,
      );
    }

    seenDays.add(day.toLowerCase());
  }
};
