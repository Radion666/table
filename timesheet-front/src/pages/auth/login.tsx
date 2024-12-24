import { useEffect } from "react";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { apiUrl } from "~src/shared/api/config";
import { apiRequests } from "~src/shared/api/requests";
import { AuthTokenStorageKey } from "~src/shared/constants/default";
import { useAppDispatch } from "~src/shared/hooks";
import { setAuth } from "~src/shared/store/user-reducer/user-reducer";
import { Button } from "~src/shared/ui/button/button";
import { Input } from "~src/shared/ui/input/input";

export interface LoginFormType {
  login: string;
  password: string;
}

export const LoginPage = () => {
  const {
    formState: { errors },
    control,
    getValues,
    handleSubmit
  } = useForm<LoginFormType>({
    defaultValues: {
      login: "",
      password: ""
    }
  });

  const dispatch = useAppDispatch();

  const mutation = useMutation<
    {
      data: {
        token: string;
      };
    },
    {
      response: {
        data: {
          message: string | string[];
        };
      };
    },
    any
  >({
    mutationFn: (loginForm: LoginFormType) => {
      return axios.post(`${apiUrl}/auth`, loginForm);
    }
  });

  useEffect(() => {
    const error = mutation?.error?.response?.data?.message;
    const errorMsg = Array.isArray(error) ? error?.[0] : error;
    if (errorMsg) {
      toast.error(errorMsg);
    }
  }, [mutation.error]);

  useEffect(() => {
    if (mutation.isSuccess) {
      const token = mutation.data.data.token;

      if (token) {
        const getUser = async () => {
          const { data } = await apiRequests.getUser();
          if (data) {
            dispatch(setAuth(data));
          }
        };
        getUser();
      }
      localStorage.setItem(AuthTokenStorageKey, token);
    }
  }, [mutation.isSuccess]);

  const onSubmit = async () => {
    mutation?.mutate(getValues());
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="h-dvh flex items-center justify-center flex-col gap-3 w-full">
      <div className="font-serif text-3xl mb-2">Вход</div>
      <Controller
        name="login"
        rules={{
          required: "Логин обязателен"
        }}
        control={control}
        render={({ field }) => (
          <Input
            label="Логин"
            {...field}
            errorMessage={errors?.login?.message}
            className="min-w-96"
          />
        )}
      />
      <Controller
        name="password"
        rules={{
          required: "Пароль обязателен"
        }}
        control={control}
        render={({ field }) => (
          <Input
            label="Пароль"
            isPassword
            errorMessage={errors?.password?.message}
            className="min-w-96"
            {...field}
          />
        )}
      />

      <Button loading={mutation.isPending} htmlType="submit" type="primary" className="mt-2">
        Войти
      </Button>
    </form>
  );
};
