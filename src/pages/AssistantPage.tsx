
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
import { getAIResponse } from "@/services/aiConversation";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

const AssistantPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

  const handleUserMessage = async (message: string) => {
    try {
      setIsLoading(true);
      
      // Format the conversation history for the AI
      const conversationHistory = conversations.slice(-5).map(conv => [
        { role: 'user' as const, content: conv.userMessage },
        { role: 'assistant' as const, content: conv.assistantMessage }
      ]).flat();
      
      // Get AI response
      const assistantMessage = await getAIResponse(message, conversationHistory);
      
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
    } catch (error) {
      console.error("Error in handleUserMessage:", error);
    } finally {
      setIsLoading(false);
    }
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
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="bg-remindher-teal hover:bg-remindher-teal/90"
                disabled={isLoading}
              >
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
