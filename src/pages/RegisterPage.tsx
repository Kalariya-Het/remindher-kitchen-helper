
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import VoicePrompt from "@/components/VoicePrompt";
import VoiceButton from "@/components/VoiceButton";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !confirmPassword) {
      toast({
        title: "Registration Failed",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(username, password);
      toast({
        title: "Registration Successful",
        description: `Account created for ${username}`,
      });
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: "Unable to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
      
      <div className="max-w-md w-full">
        <Card className="border-2 border-remindher-teal">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-remindher-teal">RemindHer</CardTitle>
            <CardDescription>Create your account</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Register"}
                </Button>
              </div>
            </form>
            
            <div className="mt-6">
              <VoicePrompt />
              <div className="text-center mt-2">
                <p className="text-sm text-muted-foreground">Try saying "Register with [username] and [password]"</p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button variant="link" className="p-0" onClick={() => navigate("/login")}>
                Login here
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <div className="fixed bottom-6 right-6">
        <VoiceButton />
      </div>
    </div>
  );
};

export default RegisterPage;
