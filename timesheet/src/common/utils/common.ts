import dayjs from 'dayjs';

export const getUserFio = (user?: any) => {
  if (!user) return '';
  return `${user?.lastName ?? ''} ${user?.firstName ?? ''} ${user?.middleName ?? ''} `;
};

export const getShortUserFio = (user: any) => {
  if (!user) return '';

  return `${user?.lastName ?? ''} ${user?.firstName?.charAt(0) + '.'} ${
    user?.middleName?.charAt(0) ?? ''
  }`;
};

export type workerStatusType = 'working' | 'fired' | 'archived';

export const workerStatuses: Record<workerStatusType, string> = {
  working: 'Работает',
  archived: 'В архиве',
  fired: 'Уволен',
};

export const checkDateForSheetValidation = (dateToCheck: string) => {
  const today = dayjs();
  const dayOfMonth = today.date();

  const date = dayjs(dateToCheck);

  if (dayOfMonth >= 15) {
    return date.isBefore(today.startOf('month'));
  } else {
    return date.isBefore(today.subtract(1, 'month').startOf('month'));
  }
};
