import { createRoot } from "react-dom/client";
import {
    BrowserRouter,
    Routes,
    Route,
} from "react-router-dom";

import "./index.css";

import Home from "./pages/Home";
import Meeting from "./pages/Meeting";

createRoot(document.getElementById("root")).render(

    <BrowserRouter>

        <Routes>

            <Route
                path="/"
                element={<Home />}
            />

            <Route
                path="/meeting/:roomId"
                element={<Meeting />}
            />

        </Routes>

    </BrowserRouter>

);