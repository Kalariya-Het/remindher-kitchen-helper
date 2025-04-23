import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Home, Bell, Clipboard, ShoppingCart, User, UserPlus, LogOut } from "lucide-react";
import VoiceButton from "./VoiceButton";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout, profile } = useAuth();

  const navItems = [
    {
      label: "Reminders",
      icon: <Bell className="h-5 w-5" />,
      path: "/reminders"
    },
    {
      label: "Tasks",
      icon: <Clipboard className="h-5 w-5" />,
      path: "/tasks"
    },
    {
      label: "Pantry",
      icon: <ShoppingCart className="h-5 w-5" />,
      path: "/pantry"
    },
    {
      label: "Assistant",
      icon: <User className="h-5 w-5" />,
      path: "/assistant"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-sm py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center" onClick={() => navigate("/")} role="button">
            <h1 className="text-2xl font-bold text-remindher-teal">RemindHer</h1>
            <span className="ml-2 text-xs bg-remindher-coral text-white px-2 py-0.5 rounded-md">
              Kitchen Helper
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
            
            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  Hello, {profile?.username ?? user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/register")}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-6 px-4">
        {children}
      </main>

      {/* Navigation Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t">
        <div className="container mx-auto flex justify-between items-center px-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="py-4 flex-1 flex flex-col items-center rounded-none">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Button>
          
          {navItems.map((item) => (
            <Button 
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className="py-4 flex-1 flex flex-col items-center rounded-none"
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>

      {/* Floating Voice Button */}
      <div className="fixed right-6 bottom-20 z-10">
        <VoiceButton />
      </div>
    </div>
  );
};

export default Layout;
