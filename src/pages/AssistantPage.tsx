
import React, { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { useVoice } from "@/contexts/VoiceContext";
import VoicePrompt from "@/components/VoicePrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, MessageSquare, Send } from "lucide-react";
import { Conversation } from "@/models";
import { saveConversation, getConversations } from "@/services/storage";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

// Kitchen-related responses
const kitchenResponses = [
  "I love helping out in the kitchen! What are you making today?",
  "Need a recipe idea? I've got plenty of suggestions!",
  "Managing a kitchen can be tough. How can I make your day easier?",
  "Would you like me to set a timer for your cooking?",
  "Is there anything specific you'd like help with in the kitchen today?",
  "Cooking can be therapeutic. It's a great way to relax.",
  "What's your favorite dish to cook? I'd love to hear about it!",
  "Need some quick dinner ideas? I'm full of them!",
  "Organizing your pantry can save you time and reduce waste. Would you like some tips?",
  "Taking a few minutes to plan your meals can make your week much smoother."
];

// General supportive responses
const supportiveResponses = [
  "I'm here to help make your day a little easier.",
  "How are you feeling today? Remember to take time for yourself.",
  "You're doing great! Managing a household is no small task.",
  "Is there something I can help you with to lighten your load?",
  "Remember to take short breaks throughout your busy day.",
  "Your wellbeing matters too. Have you taken some time for yourself today?",
  "What's been on your mind lately? Sometimes it helps just to talk about it.",
  "You've got this! Every small task completed is an accomplishment.",
  "Would you like a quick mindfulness exercise? It only takes a minute.",
  "Is there anything you're looking forward to this week?"
];

const AssistantPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inputText, setInputText] = useState("");
  const { transcript } = useVoice();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved conversations
    setConversations(getConversations());
  }, []);

  useEffect(() => {
    // Scroll to the bottom when conversations update
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  useEffect(() => {
    // Process voice commands for assistant
    if (!transcript) return;

    if (transcript.toLowerCase().includes("talk to me") || 
        transcript.toLowerCase().includes("help me in the kitchen")) {
      handleUserMessage(transcript);
    }
  }, [transcript]);

  const handleUserMessage = (message: string) => {
    // Generate a response
    const isKitchenRelated = /cook|recipe|kitchen|food|meal|dinner|lunch|breakfast|ingredients|bake|roast|fry|stir|chop|cut|prepare|dish/i.test(message);
    
    const responsePool = isKitchenRelated ? kitchenResponses : supportiveResponses;
    const assistantMessage = responsePool[Math.floor(Math.random() * responsePool.length)];
    
    // Create new conversation
    const newConversation: Conversation = {
      id: uuidv4(),
      userMessage: message,
      assistantMessage,
      timestamp: new Date().toISOString()
    };
    
    // Save conversation
    saveConversation(newConversation);
    
    // Update UI
    setConversations(getConversations());
    
    // Clear input
    setInputText("");
    
    // Speak response using speech synthesis
    const speech = new SpeechSynthesisUtterance(assistantMessage);
    speech.lang = 'en-US';
    speech.volume = 1;
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleUserMessage(inputText);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto h-[calc(100vh-13rem)]">
        <h1 className="text-3xl font-bold mb-2">Voice Assistant</h1>
        <p className="text-muted-foreground mb-6">Your personal kitchen companion</p>
        
        <VoicePrompt />
        
        <Card className="mt-8 flex flex-col h-[calc(100%-10rem)]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-remindher-coral" />
              Chat with RemindHer
            </CardTitle>
            <Separator />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Start a conversation with your assistant.</p>
                  <p className="mt-2">Try saying "Talk to me" or "Help me in the kitchen"</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div key={conversation.id} className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-accent">U</AvatarFallback>
                        <AvatarImage src="" />
                      </Avatar>
                      <div className="bg-accent rounded-lg p-3 max-w-[80%]">
                        <p>{conversation.userMessage}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(conversation.timestamp), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-remindher-teal/10 text-remindher-teal rounded-lg p-3 max-w-[80%]">
                        <p>{conversation.assistantMessage}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {format(new Date(conversation.timestamp), "h:mm a")}
                        </p>
                      </div>
                      <Avatar>
                        <AvatarFallback className="bg-remindher-teal text-white">R</AvatarFallback>
                        <AvatarImage src="" />
                      </Avatar>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message or use voice..."
                className="flex-1"
              />
              <Button type="submit" className="bg-remindher-teal hover:bg-remindher-teal/90">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AssistantPage;
