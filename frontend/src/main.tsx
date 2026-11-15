import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthInitializer } from "./component/AuthInitializer";
import { ThemeInitializer } from "./component/ThemeInitializer";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
        <AuthInitializer>
            <ThemeInitializer>
                <App />
            </ThemeInitializer>
        </AuthInitializer>
    </QueryClientProvider>
);
