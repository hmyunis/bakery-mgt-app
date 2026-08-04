import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { useAuthInit } from "./hooks/useAuthInit";
import { useTranslation } from "./locales";

function App() {
    useAuthInit();
    const { language } = useTranslation();
    return <RouterProvider key={language} router={router} />;
}

export default App;
