
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VoicePrompt from "@/components/VoicePrompt";
import Layout from "@/components/Layout";
import { Bell, Clipboard, ShoppingCart, User } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Reminders",
      icon: <Bell className="h-6 w-6" />,
      description: "Set voice reminders for your household tasks",
      path: "/reminders",
      color: "bg-remindher-teal/10",
      borderColor: "border-remindher-teal",
      textColor: "text-remindher-teal",
    },
    {
      title: "Task Assignment",
      icon: <Clipboard className="h-6 w-6" />,
      description: "Assign tasks to your household help",
      path: "/tasks",
      color: "bg-remindher-coral/10",
      borderColor: "border-remindher-coral",
      textColor: "text-remindher-coral",
    },
    {
      title: "Pantry Management",
      icon: <ShoppingCart className="h-6 w-6" />,
      description: "Keep track of your kitchen inventory",
      path: "/pantry",
      color: "bg-remindher-lightTeal/20",
      borderColor: "border-remindher-teal",
      textColor: "text-remindher-teal",
    },
    {
      title: "Voice Assistant",
      icon: <User className="h-6 w-6" />,
      description: "Your personal kitchen companion",
      path: "/assistant",
      color: "bg-remindher-lightCoral/20",
      borderColor: "border-remindher-coral",
      textColor: "text-remindher-coral",
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome to RemindHer</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Your voice-activated kitchen assistant
        </p>
        
        <div className="w-full max-w-md mb-8">
          <VoicePrompt />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
          {features.map((feature) => (
            <Card 
              key={feature.path} 
              className={`border-2 ${feature.borderColor} ${feature.color} cursor-pointer transition-all hover:shadow-md`}
              onClick={() => navigate(feature.path)}
            >
              <CardContent className="p-6 flex flex-col items-center">
                <div className={`p-3 rounded-full ${feature.color} ${feature.textColor} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 mb-6">
          <h2 className="text-xl font-semibold mb-4">Try saying:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl">
            <div className="bg-accent rounded-lg p-3">
              <p className="font-medium">"Set reminder for laundry on April 10th at 3 PM, type once"</p>
            </div>
            <div className="bg-accent rounded-lg p-3">
              <p className="font-medium">"Assign cooking to cook"</p>
            </div>
            <div className="bg-accent rounded-lg p-3">
              <p className="font-medium">"Rice, 5 kilograms"</p>
            </div>
            <div className="bg-accent rounded-lg p-3">
              <p className="font-medium">"Talk to me"</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
