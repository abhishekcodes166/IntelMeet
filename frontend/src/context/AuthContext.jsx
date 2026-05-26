import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

// Configure backend API base URL
const API_URL = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = `${API_URL}/api/v1`;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            fetchCurrentUser();
        } else {
            delete axios.defaults.headers.common["Authorization"];
            setLoading(false);
        }
    }, [token]);

    const fetchCurrentUser = async () => {
        try {
            const response = await axios.get("/users/current-user");
            if (response.data.success) {
                setUser(response.data.user);
            } else {
                logout();
            }
        } catch (error) {
            console.error("Fetch current user error:", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post("/users/login", { email, password });
            if (response.data.success) {
                const { token: userToken, user: userData } = response.data;
                localStorage.setItem("token", userToken);
                setToken(userToken);
                setUser(userData);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            console.error("Login error:", error);
            return {
                success: false,
                message: error.response?.data?.message || "Invalid credentials",
            };
        }
    };

    const register = async (fullName, email, password) => {
        try {
            const response = await axios.post("/users/register", {
                fullName,
                email,
                password,
            });
            if (response.data.success) {
                // Automatically log in after registration
                return login(email, password);
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            console.error("Registration error:", error);
            return {
                success: false,
                message: error.response?.data?.message || "Registration failed",
            };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common["Authorization"];
        setLoading(false);
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
