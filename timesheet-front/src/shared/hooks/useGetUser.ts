import { useAppSelector } from "./useAppSelector";

export const useGetUser = () => {
  const { isLoading, user } = useAppSelector((state) => state.userReducer);
  return {
    user,
    isLoading,
    userRole: user?.role?.name
  };
};
