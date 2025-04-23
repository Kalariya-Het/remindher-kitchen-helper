
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

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [isLoading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email.trim(), pw);
    setLoading(false);
    if (result.error) {
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Login Successful", description: "You are logged in." });
      nav("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" onClick={() => nav("/")}>
          Back to Home
        </Button>
      </div>
      <div className="max-w-md w-full">
        <Card className="border-2 border-remindher-teal">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-remindher-teal">RemindHer</CardTitle>
            <CardDescription>Login with your email & password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} onChange={v => setEmail(v.target.value)} placeholder="me@email.com" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={pw} onChange={v => setPw(v.target.value)} required />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </form>
            <div className="mt-6">
              <VoicePrompt />
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button variant="link" className="p-0" onClick={() => nav("/register")}>
                Register here
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

export default LoginPage;
