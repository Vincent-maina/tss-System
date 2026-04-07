import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

type AuthContextType = {
    user: any;
    token: string | null;
    login: (data: any) => Promise<any>;
    register: (data: any) => Promise<any>;
    verifyOTP: (email: string, otp: string) => Promise<any>;
    logout: () => void;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            localStorage.setItem("token", token);
            fetchMe();
        } else {
            localStorage.removeItem("token");
            setUser(null);
            setIsLoading(false);
        }
    }, [token]);

    const fetchMe = async () => {
        try {
            const data = await fetchApi("/auth/me");
            if (data.success && data.data) {
                setUser(data.data);
            } else {
                setToken(null);
            }
        } catch (err) {
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials: any) => {
        const data = await fetchApi("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
        });
        // Backend wraps token inside data.data.token
        const token = data?.data?.token || data?.token;
        const user = data?.data?.user || data?.user;
        if (data.success && token) {
            localStorage.setItem("token", token);
            setToken(token);
            if (user) setUser(user);
        }
        return data;
    };

    const register = async (userData: any) => {
        const data = await fetchApi("/auth/register", {
            method: "POST",
            body: JSON.stringify(userData),
        });
        // Register doesn't return a token (OTP step follows)
        // Return data so the caller can handle the OTP step
        return data;
    };

    const verifyOTP = async (email: string, otp: string) => {
        const data = await fetchApi("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({ email, otp }),
        });
        const token = data?.data?.token || data?.token;
        const user = data?.data?.user || data?.user;
        if (data.success && token) {
            localStorage.setItem("token", token);
            setToken(token);
            if (user) setUser(user);
        }
        return data;
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, verifyOTP, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
