import React, { createContext, useContext, useState, useCallback } from "react";
import type { User } from "./api";

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  logout: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("ai_assessment_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleSetUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem("ai_assessment_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("ai_assessment_user");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_name");
      localStorage.removeItem("user_email");
    }
  }, []);

  const logout = useCallback(() => {
    handleSetUser(null);
  }, [handleSetUser]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser: handleSetUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
