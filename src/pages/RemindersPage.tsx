
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/ui/use-toast";
import { useVoice } from "@/contexts/VoiceContext";
import VoicePrompt from "@/components/VoicePrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useReminderVoiceCommands } from "@/hooks/useReminderVoiceCommands";
import { notifyReminder, showReminderToast } from "@/utils/reminderNotifications";
import ReminderList from "@/components/reminders/ReminderList";
import type { Reminder } from "@/models";

const RemindersPage = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeReminders, setActiveReminders] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const { transcript } = useVoice();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch reminders from Supabase
  const fetchReminders = async () => {
    setLoading(true);
    try {
      if (user) {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) {
          console.error("Error fetching reminders from Supabase:", error);
          toast({
            title: "Error",
            description: "Could not fetch reminders. Please try again.",
            variant: "destructive",
          });
          setReminders([]);
        } else if (data) {
          // Ensure we properly map database fields to our model
          const mappedReminders: Reminder[] = data.map(item => ({
            id: item.id,
            task_name: item.task_name,
            date: item.date,
            time: item.time,
            type: item.type as "daily" | "once",
            completed: Boolean(item.completed),
            user_id: item.user_id
          }));
          setReminders(mappedReminders);
        }
      }
    } catch (error) {
      console.error("Error in fetchReminders:", error);
      setReminders([]);
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
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().substring(0, 5);
      
      reminders.forEach(reminder => {
        if (!reminder.completed && !activeReminders[reminder.id]) {
          if (reminder.date === currentDate && reminder.time === currentTime) {
            setActiveReminders(prev => ({ ...prev, [reminder.id]: true }));
            notifyReminder(
              reminder,
              () => handleToggleComplete(reminder),
              () => snoozeReminder(reminder)
            );
          }
        }
      });
    };
    
    checkReminders();
    const intervalId = setInterval(checkReminders, 60000);
    return () => clearInterval(intervalId);
  }, [reminders, activeReminders]);

  const createReminder = async (reminderData: Omit<Reminder, 'id'>) => {
    if (!user) return;
    
    try {
      // Remove any id field if it exists (as Supabase will generate one)
      const { id, ...reminderWithoutId } = reminderData as any;
      
      const { error } = await supabase
        .from('reminders')
        .insert(reminderWithoutId);
        
      if (error) {
        console.error("Error creating reminder in Supabase:", error);
        toast({
          title: "Error",
          description: "Could not create reminder. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in createReminder:", error);
    }
  };

  const snoozeReminder = (reminder: Reminder) => {
    setActiveReminders(prev => {
      const newState = { ...prev };
      delete newState[reminder.id];
      return newState;
    });
    
    toast({
      title: "Reminder Snoozed",
      description: `${reminder.task_name} will remind you again in 5 minutes`
    });
    
    setTimeout(() => {
      notifyReminder(
        reminder,
        () => handleToggleComplete(reminder),
        () => snoozeReminder(reminder)
      );
    }, 5 * 60 * 1000);
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: !reminder.completed })
        .eq('id', reminder.id);
        
      if (error) {
        console.error("Error updating reminder in Supabase:", error);
        toast({
          title: "Error",
          description: "Could not update reminder. Please try again.",
          variant: "destructive",
        });
      } else {
        if (!reminder.completed) {
          setActiveReminders(prev => {
            const newState = { ...prev };
            delete newState[reminder.id];
            return newState;
          });
        }
      }
    } catch (error) {
      console.error("Error in handleToggleComplete:", error);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting reminder from Supabase:", error);
        toast({
          title: "Error",
          description: "Could not delete reminder. Please try again.",
          variant: "destructive",
        });
      } else {
        setActiveReminders(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }
    } catch (error) {
      console.error("Error in handleDeleteReminder:", error);
    }
  };

  // Process voice commands
  const { processVoiceCommand } = useReminderVoiceCommands({
    user,
    createReminder,
    listReminders: () => showReminderToast(reminders)
  });

  useEffect(() => {
    if (transcript) {
      processVoiceCommand(transcript);
    }
  }, [transcript, processVoiceCommand]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Reminders</h1>
        <p className="text-muted-foreground mb-6">Manage your voice-activated reminders</p>
        
        <VoicePrompt />
        
        {!user && (
          <div className="my-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-md">
            <p className="text-yellow-800 dark:text-yellow-200">
              You're not logged in. Sign in to save your reminders across devices.
            </p>
          </div>
        )}
        
        <div className="mt-8">
          <ReminderList
            reminders={reminders}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteReminder}
            loading={loading}
          />
        </div>
        
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
