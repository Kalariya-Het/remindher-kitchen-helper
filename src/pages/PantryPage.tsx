
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getPantryItems, savePantryItem, deletePantryItem } from "@/services/storage";
import { PantryItem } from "@/models";
import { useToast } from "@/components/ui/use-toast";
import { useVoice } from "@/contexts/VoiceContext";
import VoicePrompt from "@/components/VoicePrompt";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

const PantryPage = () => {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const { transcript } = useVoice();
  const { toast } = useToast();
  const [processingVoice, setProcessingVoice] = useState(false);

  useEffect(() => {
    // Load saved pantry items
    setPantryItems(getPantryItems());
  }, []);

  useEffect(() => {
    // Process voice commands for pantry management
    if (!transcript || processingVoice) return;

    // Prevent duplicate processing
    setProcessingVoice(true);

    try {
      // Better pattern matching for various input formats
      // Check for comma-separated format: "Rice, 5 kilograms"
      const commaPattern = /^\s*([\w\s]+?)\s*,\s*([\w\s\d]+)\s*$/i;
      // Also check for simple format: "wheat 10 kg"
      const simplePattern = /^\s*([\w\s]+?)\s+(\d+[\w\s]*)\s*$/i;

      const commaMatch = transcript.match(commaPattern);
      const simpleMatch = transcript.match(simplePattern);
      
      let name, quantity;

      if (commaMatch) {
        // If it matches comma pattern
        [, name, quantity] = commaMatch;
      } else if (simpleMatch) {
        // If it matches simple pattern
        [, name, quantity] = simpleMatch;
      }

      if (name && quantity) {
        const now = new Date();
        
        // Create new pantry item
        const newItem: PantryItem = {
          id: uuidv4(),
          name: name.trim(),
          quantity: quantity.trim(),
          date: format(now, "yyyy-MM-dd"),
          time: format(now, "HH:mm")
        };
        
        console.log("Creating pantry item:", newItem);
        
        // Save item
        savePantryItem(newItem);
        
        // Update UI
        setPantryItems(getPantryItems());
        
        // Notify user
        toast({
          title: "Pantry Item Added",
          description: `Added ${quantity} of ${name} to your pantry`,
        });
      } else if (transcript.toLowerCase().includes("what's in my pantry")) {
        // Read out pantry items
        if (pantryItems.length === 0) {
          toast({
            title: "Pantry",
            description: "Your pantry is empty",
          });
        } else {
          const itemSummary = pantryItems
            .slice(0, 3)
            .map(item => `${item.quantity} of ${item.name}`)
            .join(", ");
          
          toast({
            title: "Your Pantry",
            description: itemSummary + (pantryItems.length > 3 ? ` and ${pantryItems.length - 3} more items` : ""),
          });
        }
      }
    } finally {
      // Reset processing flag
      setTimeout(() => {
        setProcessingVoice(false);
      }, 1000); // Add a small delay to prevent immediate re-processing
    }
  }, [transcript, pantryItems]);

  const handleDeleteItem = (id: string) => {
    deletePantryItem(id);
    setPantryItems(getPantryItems());
    toast({
      title: "Item Deleted",
      description: "Item has been removed from your pantry",
    });
  };

  const formatDateTimeDisplay = (dateStr: string, timeStr: string) => {
    try {
      return `${format(new Date(dateStr), "MMM d, yyyy")} at ${timeStr}`;
    } catch (error) {
      return `${dateStr} at ${timeStr}`;
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Pantry Management</h1>
        <p className="text-muted-foreground mb-6">Track your kitchen inventory</p>
        
        <VoicePrompt />
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5 text-remindher-teal" />
              Your Pantry
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pantryItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Your pantry is empty.</p>
                <p className="mt-2">Try saying "Rice, 5 kilograms" or "wheat 10 kg"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pantryItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-4 border rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center">
                        <p className="font-medium">{item.name}</p>
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-remindher-lightTeal/20 text-remindher-teal text-sm">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Added on {formatDateTimeDisplay(item.date, item.time)}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-6 p-4 bg-accent rounded-lg">
          <h3 className="font-medium mb-2">Voice Commands</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li className="text-sm">"[Item name], [quantity]" (e.g., "Rice, 5 kilograms")</li>
            <li className="text-sm">"[Item name] [quantity]" (e.g., "wheat 10 kg")</li>
            <li className="text-sm">"What's in my pantry?"</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default PantryPage;
