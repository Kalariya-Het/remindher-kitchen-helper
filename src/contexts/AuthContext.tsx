
import React, { createContext, useState, useContext, useEffect } from "react";

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem("remindher-user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    // In a real app, this would validate against a backend
    // For this prototype, we'll simulate a successful login after a delay
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const newUser = { username };
        setUser(newUser);
        localStorage.setItem("remindher-user", JSON.stringify(newUser));
        resolve();
      }, 1000);
    });
  };

  const register = async (username: string, password: string) => {
    // In a real app, this would create a user in a backend
    // For this prototype, we'll simulate a successful registration
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const newUser = { username };
        setUser(newUser);
        localStorage.setItem("remindher-user", JSON.stringify(newUser));
        resolve();
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("remindher-user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};
