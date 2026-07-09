/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { setAuthToken, setUnauthorizedHandler } from "../lib/api";
import { connectSocket, disconnectSocket } from "../socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    // Only "loading" while we validate a persisted token
    const [loading, setLoading] = useState(() => !!localStorage.getItem("token"));

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setAuthToken(null);
        disconnectSocket();
        setLoading(false);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(logout);
    }, [logout]);

    useEffect(() => {
        let cancelled = false;

        if (!token) {
            setAuthToken(null);
            return;
        }

        setAuthToken(token);
        connectSocket(token);

        const fetchCurrentUser = async () => {
            try {
                const response = await api.get("/users/current-user");
                if (cancelled) return;
                if (response.data.success) {
                    setUser(response.data.user);
                } else {
                    logout();
                }
            } catch {
                if (!cancelled) logout();
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchCurrentUser();
        return () => {
            cancelled = true;
        };
    }, [token, logout]);

    const login = async (email, password) => {
        try {
            const response = await api.post("/users/login", { email, password });
            if (response.data.success) {
                const { token: userToken, user: userData } = response.data;
                localStorage.setItem("token", userToken);
                setAuthToken(userToken);
                setUser(userData);
                setToken(userToken);
                connectSocket(userToken);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Invalid credentials",
            };
        }
    };

    const register = async (fullName, email, password) => {
        try {
            const response = await api.post("/users/register", {
                fullName,
                email,
                password,
            });
            if (response.data.success) {
                return login(email, password);
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Registration failed",
            };
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
