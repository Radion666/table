import { Suspense, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";

import { Fallback } from "~src/components/fallback/fallback";
import { NavBar } from "~src/components/navbar/navbar";
import { apiRequests } from "~src/shared/api/requests";
import { AuthTokenStorageKey } from "~src/shared/constants/default";
import { AuthRoutes, MainRoutes, ROUTE_CONSTANTS } from "~src/shared/constants/routes";
import { useAppDispatch } from "~src/shared/hooks";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { setAuth, updateAuthLoading } from "~src/shared/store/user-reducer/user-reducer";

export const Routing = () => {
  const { user, isLoading, userRole } = useGetUser();
  const dispatch = useAppDispatch();

  const { data, isFetching } = useQuery({
    queryKey: ["get user"],
    queryFn: () => apiRequests.getUser(),
    retry: false,
    enabled: !!(localStorage.getItem(AuthTokenStorageKey) ?? false)
  });

  useEffect(() => {
    dispatch(updateAuthLoading(isFetching));
  }, [isFetching]);

  useEffect(() => {
    const user = data?.data;

    if (user?.login) {
      dispatch(setAuth(user));
    }
  }, [data]);

  return (
    <div className="flex h-full w-full">
      {!!user && <NavBar />}
      <Suspense fallback={<Fallback />}>
        {isFetching ? (
          <Fallback />
        ) : (
          <Routes>
            {user?.login ? (
              <>
                {MainRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={<route.component />} />
                ))}
              </>
            ) : (
              <>
                {AuthRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={<route.component />} />
                ))}
              </>
            )}
            {user?.login && (
              <Route path="*" element={<Navigate replace to={ROUTE_CONSTANTS.TIMESHEET_LOGS} />} />
            )}
            {!user?.login && !isLoading && (
              <Route path="*" element={<Navigate replace to={ROUTE_CONSTANTS.LOGIN} />} />
            )}
          </Routes>
        )}
      </Suspense>
    </div>
  );
};
