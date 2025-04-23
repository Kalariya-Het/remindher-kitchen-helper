
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
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm) {
      toast({ title: "Passwords Don't Match", description: "Please make sure your passwords match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const result = await register(email.trim(), pw, username.trim());
    setLoading(false);
    if (result.error) {
      toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Registration Successful", description: `Registered with ${email}` });
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
            <CardDescription>Create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={pw} onChange={e => setPw(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Register"}
                </Button>
              </div>
            </form>
            <div className="mt-6">
              <VoicePrompt />
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button variant="link" className="p-0" onClick={() => nav("/login")}>
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
