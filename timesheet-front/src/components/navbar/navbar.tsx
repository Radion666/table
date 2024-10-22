import clsx from "clsx";
import { useLocation, useNavigate } from "react-router-dom";

import styles from "./styles.module.css";
import { navbarItems } from "./utils/constants";

import { AuthTokenStorageKey } from "~src/shared/constants/default";
import { useAppDispatch } from "~src/shared/hooks";
import { useGetUser } from "~src/shared/hooks/useGetUser";
import { logoutUser } from "~src/shared/store/user-reducer/user-reducer";
import { Icon } from "~src/shared/ui/icon/icon";

export const NavBar = () => {
  const { userRole } = useGetUser();

  const dispatch = useAppDispatch();

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(AuthTokenStorageKey);
    dispatch(logoutUser());
  };

  return (
    <div className="h-full flex items-center flex-col gap-5 bg-[#E5E5E5] p-5 min-w-40 max-w-40 justify-center">
      {navbarItems
        ?.filter((item) => item.allowedRoles.includes(userRole))
        .map((item) => {
          const isSelected = item.url?.includes(pathname.replace(/\/(\d+)$/, "/:id"));
          return (
            <a
              onClick={(e) => {
                e.preventDefault();

                navigate(item.url?.[0]);
              }}
              target="_blank"
              href={item.url}
              className={clsx(
                styles.btn,
                "min-w-36 min-h-12 rounded-lg items-center justify-center flex gap-2 cursor-pointer",
                isSelected && "bg-blue-600 text-white hover:text-neutral-300 ",
                !isSelected && "text-[#343434]  hover:text-[#B74858]"
              )}>
              <Icon name={item.icon} size={24} className="cursor-pointer" />
              <div className="text-nowrap">{item.label}</div>
            </a>
          );
        })}
      <button onClick={handleLogout} className="absolute bottom-10">
        <Icon name="Logout" size={24} className="hover:text-[#B74858]" />
      </button>
    </div>
  );
};
