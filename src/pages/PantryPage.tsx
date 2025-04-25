
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
import { useAuth } from "@/contexts/AuthContext";
import { toast as sonnerToast } from "sonner";

const PantryPage = () => {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { transcript } = useVoice();
  const { toast } = useToast();
  const [processingVoice, setProcessingVoice] = useState(false);
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch pantry items from Supabase
  const fetchPantryItems = async () => {
    setLoading(true);
    try {
      if (user) {
        // First try to get from Supabase
        const { data, error } = await supabase
          .from('pantry_items')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) {
          console.error("Error fetching pantry items from Supabase:", error);
          // Fallback to local storage if Supabase fails
          setPantryItems(getPantryItems());
        } else if (data) {
          // Map Supabase data to our PantryItem model
          const mappedItems: PantryItem[] = data.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity.toString(),
            date: format(new Date(item.created_at || new Date()), "yyyy-MM-dd"),
            time: format(new Date(item.created_at || new Date()), "HH:mm")
          }));
          setPantryItems(mappedItems);
        }
      } else {
        // Not logged in, use local storage
        setPantryItems(getPantryItems());
      }
    } catch (error) {
      console.error("Error in fetchPantryItems:", error);
      // Fallback to local storage
      setPantryItems(getPantryItems());
    } finally {
      setLoading(false);
    }
  };

  // Initialize by fetching pantry items
  useEffect(() => {
    fetchPantryItems();
    
    // Set up real-time subscription
    if (user) {
      const channel = supabase
        .channel('public:pantry_items')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'pantry_items',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchPantryItems();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    // Process voice commands for pantry management
    if (!transcript || processingVoice) return;

    // Prevent duplicate processing
    setProcessingVoice(true);

    const processVoiceCommand = async () => {
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
          // Check if we're already processing this exact item
          const itemKey = `${name}-${quantity}`;
          
          if (itemKey === processingItem) {
            console.log("Already processing this pantry item, skipping duplicate");
            return;
          }
          
          // Set this item as being processed to prevent duplicates
          setProcessingItem(itemKey);
        
          const now = new Date();
          
          // Check if this item already exists
          const existingItem = pantryItems.find(item => 
            item.name.toLowerCase() === name.trim().toLowerCase()
          );
          
          if (existingItem) {
            // For existing items, consider updating the quantity instead
            toast({
              title: "Similar Item Exists",
              description: `You already have "${name}" in your pantry. Adding as new item.`,
            });
          }
          
          // Create new pantry item
          const newItem: PantryItem = {
            id: uuidv4(),
            name: name.trim(),
            quantity: quantity.trim(),
            date: format(now, "yyyy-MM-dd"),
            time: format(now, "HH:mm")
          };
          
          if (user) {
            // Save to Supabase
            const { error } = await supabase
              .from('pantry_items')
              .insert({
                id: newItem.id,
                name: newItem.name,
                quantity: parseInt(quantity) || 0,
                user_id: user.id
              });
              
            if (error) {
              console.error("Error saving pantry item to Supabase:", error);
              // Fallback to local storage
              savePantryItem(newItem);
              setPantryItems(getPantryItems());
            } else {
              fetchPantryItems();
            }
          } else {
            // Not logged in, use local storage only
            savePantryItem(newItem);
            setPantryItems(getPantryItems());
          }
          
          // Notify user with enhanced toast
          sonnerToast("Pantry Item Added", {
            description: `Added ${quantity} of ${name} to your pantry`,
            className: "w-[400px] p-6 rounded-lg bg-gray-900 text-white font-medium"
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
        // Reset processing flags
        setTimeout(() => {
          setProcessingVoice(false);
          setProcessingItem(null);
        }, 1000);
      }
    };
    
    processVoiceCommand();
  }, [transcript, pantryItems, processingVoice, processingItem, user]);

  const handleDeleteItem = async (id: string) => {
    if (user) {
      // Delete from Supabase
      const { error } = await supabase
        .from('pantry_items')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting pantry item from Supabase:", error);
        // Fallback to local storage
        deletePantryItem(id);
        setPantryItems(getPantryItems());
      } else {
        fetchPantryItems();
      }
    } else {
      // Not logged in, use local storage only
      deletePantryItem(id);
      setPantryItems(getPantryItems());
    }
    
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
        
        {!user && (
          <div className="my-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-md">
            <p className="text-yellow-800 dark:text-yellow-200">
              You're not logged in. Pantry items will be stored locally but won't sync across devices.
              <Button variant="link" className="p-0 h-auto ml-2">
                Login to sync
              </Button>
            </p>
          </div>
        )}
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5 text-remindher-teal" />
              Your Pantry
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-remindher-teal border-t-transparent rounded-full"></div>
              </div>
            ) : pantryItems.length === 0 ? (
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
