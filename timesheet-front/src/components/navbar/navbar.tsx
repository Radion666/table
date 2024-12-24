import { Tooltip } from "antd";
import clsx from "clsx";
import { useLocation, useNavigate } from "react-router-dom";

import styles from "./styles.module.css";
import { allowedRolesType, navbarItems } from "./utils/constants";

import { AuthTokenStorageKey } from "~src/shared/constants/default";
import { useAppDispatch } from "~src/shared/hooks";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { logoutUser } from "~src/shared/store/user-reducer/user-reducer";
import { Icon } from "~src/shared/ui/icon/icon";
import { getShortUserFio } from "~src/shared/utils/default";

export const NavBar = () => {
  const { userRole, user } = useGetUser();

  const dispatch = useAppDispatch();

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(AuthTokenStorageKey);
    dispatch(logoutUser());
  };

  return (
    <div className="h-full flex items-center flex-col gap-5 bg-[#E5E5E5] p-5 min-w-24 max-w-24 justify-center max-md:h-[80px] max-md:min-w-[100vw] max-md:flex-row max-md:gap-3">
      <button className="md:absolute md:top-10 max-md:hidden flex flex-col justify-center items-center">
        <Icon name="User" size={24} className="hover:text-[#B74858]" />
        {getShortUserFio(user)}
      </button>
      {navbarItems
        ?.filter((item) => item.allowedRoles.includes(userRole as allowedRolesType))
        .map((item) => {
          const isSelected = item.url?.includes(pathname.replace(/\/(\d+)$/, "/:id"));
          return (
            <Tooltip placement="top" title={item?.label} trigger={"hover"}>
              <a
                onClick={(e) => {
                  e.preventDefault();

                  navigate(item.url?.[0]);
                }}
                target="_blank"
                href={item.url?.[0]}
                className={clsx(
                  styles.btn,
                  "w-16 min-h-12 rounded-lg items-center justify-center flex gap-2 cursor-pointer max-md:max-w-[32px] max-md:min-w-[32px] max-md:min-h-10",
                  isSelected && "bg-blue-600 text-white hover:text-neutral-300 ",
                  !isSelected && "text-[#343434]  hover:text-[#B74858]"
                )}>
                <Icon name={item.icon} size={24} className="cursor-pointer" />
                {/* <div className="text-nowrap max-md:hidden">{item.label}</div> */}
              </a>
            </Tooltip>
          );
        })}
      <button onClick={handleLogout} className="md:absolute md:bottom-10">
        <Icon name="Logout" size={24} className="hover:text-[#B74858]" />
      </button>
    </div>
  );
};
