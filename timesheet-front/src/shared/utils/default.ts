export const removeLeadingZeroFromDate = (date: string) => {
  return date?.startsWith("0") ? date.slice(1) : date;
};

export const getUserFio = (user?: any) => {
  if (!user) return "";
  return `${user?.lastName ?? ""} ${user?.firstName ?? ""} ${user?.middleName ?? ""} `;
};

export const getShortUserFio = (user: any) => {
  if (!user) return "";

  return `${user?.lastName ?? ""} ${user?.firstName?.charAt(0) + "." ?? ""} ${
    user?.middleName?.charAt(0) ?? ""
  }`;
};
