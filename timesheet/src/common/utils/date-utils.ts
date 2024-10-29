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
