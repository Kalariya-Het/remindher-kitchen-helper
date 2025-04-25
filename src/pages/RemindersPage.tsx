import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getReminders, saveReminder, updateReminder, deleteReminder } from "@/services/storage";
import { Reminder } from "@/models";
import { useToast } from "@/components/ui/use-toast";
import { useVoice } from "@/contexts/VoiceContext";
import VoicePrompt from "@/components/VoicePrompt";
import { format, parse, isEqual, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Clock, Calendar, Trash2, Check, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast as sonnerToast } from "sonner";
import { speakText } from "@/utils/speechSynthesis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const RemindersPage = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeReminders, setActiveReminders] = useState<{ [id: string]: boolean }>({});
  const [processingVoice, setProcessingVoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingReminder, setProcessingReminder] = useState<string | null>(null);
  const { transcript } = useVoice();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch reminders from Supabase
  const fetchReminders = async () => {
    setLoading(true);
    try {
      if (user) {
        // First try to get from Supabase
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id as string);
          
        if (error) {
          console.error("Error fetching reminders from Supabase:", error);
          // Fallback to local storage if Supabase fails
          setReminders(getReminders());
        } else if (data && Array.isArray(data)) {
          // Map Supabase data to our Reminder model
          const mappedReminders: Reminder[] = data.map(item => ({
            id: item.id,
            taskName: item.task_name,
            date: item.date,
            time: item.time,
            type: item.type as "daily" | "once",
            completed: item.completed || false
          }));
          setReminders(mappedReminders);
          
          // Also update local storage for offline access
          mappedReminders.forEach(reminder => {
            saveReminder(reminder, false); // Save without re-fetching
          });
        }
      } else {
        // Not logged in, use local storage
        setReminders(getReminders());
      }
    } catch (error) {
      console.error("Error in fetchReminders:", error);
      // Fallback to local storage
      setReminders(getReminders());
    } finally {
      setLoading(false);
    }
  };

  // Initialize by fetching reminders
  useEffect(() => {
    fetchReminders();
    
    // Set up real-time subscription
    if (user) {
      const channel = supabase
        .channel('public:reminders')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'reminders',
          filter: `user_id=eq.${user.id}`
        }, () => {
          // Refetch reminders when changes occur
          fetchReminders();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Check for active reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentDate = format(now, "yyyy-MM-dd");
      const currentTime = format(now, "HH:mm");
      
      reminders.forEach(reminder => {
        if (!reminder.completed && !activeReminders[reminder.id]) {
          const reminderDate = reminder.date;
          const reminderTime = reminder.time;
          
          const isToday = reminderDate === currentDate;
          
          if (isToday && reminderTime === currentTime.substring(0, 5)) {
            setActiveReminders(prev => ({ ...prev, [reminder.id]: true }));
            notifyReminder(reminder);
          }
        }
      });
    };
    
    checkReminders();
    
    const intervalId = setInterval(checkReminders, 60000);
    return () => clearInterval(intervalId);
  }, [reminders, activeReminders]);

  // Notification function
  const notifyReminder = (reminder: Reminder) => {
    speakText(`Reminder for ${reminder.taskName}`);
    
    sonnerToast("Reminder Time", {
      description: `It's time for: ${reminder.taskName}`,
      duration: 60000,
      className: "w-[400px] p-6 rounded-lg bg-gray-900 text-white font-medium", // Enhanced toast styling
      action: {
        label: "Complete",
        onClick: () => handleToggleComplete(reminder)
      },
      cancel: {
        label: "Snooze 5m",
        onClick: () => snoozeReminder(reminder)
      },
      onDismiss: () => snoozeReminder(reminder)
    });
  };

  const snoozeReminder = (reminder: Reminder) => {
    setActiveReminders(prev => {
      const newState = { ...prev };
      delete newState[reminder.id];
      return newState;
    });
    
    toast({
      title: "Reminder Snoozed",
      description: `${reminder.taskName} will remind you again in 5 minutes`
    });
    
    setTimeout(() => {
      notifyReminder(reminder);
    }, 5 * 60 * 1000);
  };

  // Process voice commands for reminders
  useEffect(() => {
    if (!transcript || processingVoice) return;
    
    setProcessingVoice(true);

    // Create a separate async function to handle the processing
    const processVoiceCommand = async () => {
      try {
        // Check if the transcript matches our reminder pattern
        const reminderMatch = transcript.match(/set reminder for (.*?) on (.*?) at (.*?)(?:,| type| type:) (daily|once)/i);
  
        if (reminderMatch) {
          const [, taskName, dateStr, timeStr, typeStr] = reminderMatch;
          
          // Check if we're already processing this exact reminder
          const reminderKey = `${taskName}-${dateStr}-${timeStr}-${typeStr}`;
          
          if (reminderKey === processingReminder) {
            console.log("Already processing this reminder, skipping duplicate");
            return;
          }
          
          // Set this reminder as being processed to prevent duplicates
          setProcessingReminder(reminderKey);
          
          try {
            let dateObj;
            try {
              dateObj = new Date(dateStr);
              if (isNaN(dateObj.getTime())) throw new Error("Invalid date format");
            } catch (e) {
              const monthMatch = dateStr.match(/(\w+)\s+(\d+)(?:st|nd|rd|th)?/i);
              if (monthMatch) {
                const [, month, day] = monthMatch;
                const year = new Date().getFullYear();
                const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
                const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(month.toLowerCase()));
                
                if (monthIndex !== -1) {
                  dateObj = new Date(year, monthIndex, parseInt(day));
                } else {
                  throw new Error("Could not parse month name");
                }
              } else {
                throw new Error("Could not parse date format");
              }
            }
            
            const dateFormatted = format(dateObj, "yyyy-MM-dd");
            
            let timeFormatted = timeStr.trim();
            
            const timeTwelveHourMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
            if (timeTwelveHourMatch) {
              let [, hours, minutes, period] = timeTwelveHourMatch;
              let hr = parseInt(hours);
              
              if (period.toLowerCase().includes('p') && hr < 12) {
                hr += 12;
              } else if (period.toLowerCase().includes('a') && hr === 12) {
                hr = 0;
              }
              
              const formattedHr = hr.toString().padStart(2, '0');
              const formattedMin = (minutes || '00').padStart(2, '0');
              timeFormatted = `${formattedHr}:${formattedMin}`;
            }
            
            // Check if this reminder already exists to prevent duplicates
            const existingReminder = reminders.find(r => 
              r.taskName === taskName && 
              r.date === dateFormatted && 
              r.time === timeFormatted
            );
            
            if (existingReminder) {
              console.log("Reminder already exists, not creating duplicate");
              toast({
                title: "Reminder Already Exists",
                description: `You already have a reminder set for ${taskName} on ${format(dateObj, "MMM d")} at ${timeFormatted}`,
              });
              return;
            }
            
            const newReminder: Reminder = {
              id: uuidv4(),
              taskName,
              date: dateFormatted,
              time: timeFormatted,
              type: typeStr.toLowerCase() as "daily" | "once",
              completed: false
            };
            
            console.log("Creating reminder:", newReminder);
            
            // Save to Supabase first, then local storage
            if (user) {
              // Use Supabase
              const { error } = await supabase
                .from('reminders')
                .insert({
                  task_name: newReminder.taskName,
                  date: newReminder.date,
                  time: newReminder.time,
                  type: newReminder.type,
                  completed: newReminder.completed,
                  user_id: user.id
                });
                
              if (error) {
                console.error("Error saving reminder to Supabase:", error);
                // Fallback to local storage
                saveReminder(newReminder);
              } else {
                // Save to local storage as backup
                saveReminder(newReminder, false); // Don't trigger re-fetch from local storage
                // Fetch from Supabase to ensure UI is up to date
                fetchReminders();
              }
            } else {
              // Not logged in, use local storage only
              saveReminder(newReminder);
              setReminders(getReminders());
            }
            
            toast({
              title: "Reminder Set",
              description: `Reminder for ${taskName} set for ${format(dateObj, "MMM d")} at ${timeFormatted}, ${typeStr}`,
            });
          } catch (error) {
            console.error("Error parsing reminder:", error);
            toast({
              title: "Error Setting Reminder",
              description: "Please try again with a valid date and time format",
              variant: "destructive",
            });
          }
        } else if (transcript.toLowerCase().includes("what are my reminders")) {
          if (reminders.length === 0) {
            toast({
              title: "Reminders",
              description: "You have no reminders set",
            });
          } else {
            const reminderSummary = reminders
              .slice(0, 3)
              .map(r => `${r.taskName} on ${r.date} at ${r.time}`)
              .join(", ");
            
            toast({
              title: "Your Reminders",
              description: reminderSummary + (reminders.length > 3 ? ` and ${reminders.length - 3} more` : ""),
            });
          }
        }
      } finally {
        setTimeout(() => {
          setProcessingVoice(false);
          setProcessingReminder(null);
        }, 1000);
      }
    };
    
    // Call the async function
    processVoiceCommand();
  }, [transcript, processingVoice, processingReminder, reminders, user]);

  // Toggle reminder completion
  const handleToggleComplete = async (reminder: Reminder) => {
    const updatedReminder = { ...reminder, completed: !reminder.completed };
    
    if (user) {
      // Update in Supabase
      const { error } = await supabase
        .from('reminders')
        .update({ 
          completed: updatedReminder.completed 
        })
        .eq('id', reminder.id as string);
        
      if (error) {
        console.error("Error updating reminder completion in Supabase:", error);
        // Fallback to local storage
        updateReminder(updatedReminder);
        setReminders(getReminders());
      } else {
        // Update local storage
        updateReminder(updatedReminder, false); // Don't trigger re-fetch
        // Refresh from Supabase
        fetchReminders();
      }
    } else {
      // Not logged in, use local storage only
      updateReminder(updatedReminder);
      setReminders(getReminders());
    }
    
    if (updatedReminder.completed) {
      setActiveReminders(prev => {
        const newState = { ...prev };
        delete newState[reminder.id];
        return newState;
      });
      
      toast({
        title: "Reminder Completed",
        description: `${reminder.taskName} marked as completed`,
      });
    }
  };

  // Delete a reminder
  const handleDeleteReminder = async (id: string) => {
    if (user) {
      // Delete from Supabase
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id as string);
        
      if (error) {
        console.error("Error deleting reminder from Supabase:", error);
        // Fallback to local storage
        deleteReminder(id);
        setReminders(getReminders());
      } else {
        // Delete from local storage
        deleteReminder(id, false); // Don't trigger re-fetch
        // Refresh from Supabase
        fetchReminders();
      }
    } else {
      // Not logged in, use local storage only
      deleteReminder(id);
      setReminders(getReminders());
    }
    
    setActiveReminders(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    
    toast({
      title: "Reminder Deleted",
      description: "Your reminder has been removed",
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (error) {
      return dateStr;
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Reminders</h1>
        <p className="text-muted-foreground mb-6">Manage your voice-activated reminders</p>
        
        <VoicePrompt />
        
        {!user && (
          <div className="my-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-md">
            <p className="text-yellow-800 dark:text-yellow-200">
              You're not logged in. Reminders will be stored locally but won't sync across devices.
              <Button variant="link" className="p-0 h-auto ml-2">
                Login to sync
              </Button>
            </p>
          </div>
        )}
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-remindher-teal" />
              Your Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-remindher-teal border-t-transparent rounded-full"></div>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No reminders yet.</p>
                <p className="mt-2">Try saying "Set reminder for coffee on April 25th at 2:15 p.m., type once"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reminders.map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className={`p-4 border rounded-lg flex items-center justify-between ${
                      reminder.completed ? "bg-muted/40" : "bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={reminder.completed}
                        onCheckedChange={() => handleToggleComplete(reminder)}
                      />
                      <div>
                        <p className={`font-medium ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
                          {reminder.taskName}
                        </p>
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {formatDateDisplay(reminder.date)}
                          <Clock className="h-3.5 w-3.5 mx-1 ml-3" />
                          {reminder.time}
                          <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${
                            reminder.type === "daily" 
                              ? "bg-remindher-teal/20 text-remindher-teal" 
                              : "bg-remindher-coral/20 text-remindher-coral"
                          }`}>
                            {reminder.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteReminder(reminder.id)}
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
            <li className="text-sm">"Set reminder for [task] on [date] at [time], type [daily/once]"</li>
            <li className="text-sm">"What are my reminders?"</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default RemindersPage;
