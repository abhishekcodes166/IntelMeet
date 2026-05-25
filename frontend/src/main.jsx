import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import History from "./pages/History";
import Meeting from "./pages/Meeting";
import Login from "./pages/Login";
import Register from "./pages/Register";

createRoot(document.getElementById("root")).render(
    <AuthProvider>
        <BrowserRouter>
            <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Shell Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Home />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/history"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <History />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                {/* Immersive Protected Call Room */}
                <Route
                    path="/meeting/:roomId"
                    element={
                        <ProtectedRoute>
                            <Meeting />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    </AuthProvider>
);