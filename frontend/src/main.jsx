/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";

// Route-level code splitting keeps the initial bundle small —
// the meeting room (PeerJS + heavy UI) only loads when needed.
const Home = lazy(() => import("./pages/Home"));
const History = lazy(() => import("./pages/History"));
const MeetingLayout = lazy(() => import("./pages/MeetingLayout"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/70 animate-spin" />
    </div>
);

createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Public auth routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Protected shell routes */}
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

                        {/* Immersive call room */}
                        <Route
                            path="/meeting/:roomId"
                            element={
                                <ProtectedRoute>
                                    <MeetingLayout />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    </ErrorBoundary>
);
