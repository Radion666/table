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
