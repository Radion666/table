import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Routing } from "~src/pages";
import { setupStore } from "~src/shared/store/store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false
    }
  }
});

export const App = () => {
  console.log("test2224242424");

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Provider store={setupStore()}>
          <div className="h-svh">
            <Routing />
            <ToastContainer position="bottom-right" autoClose={1000} />
          </div>
        </Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
