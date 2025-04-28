
import React, { useState, useEffect, useCallback } from "react";
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
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>("");

  // Fetch reminders from Supabase
  const fetchReminders = async () => {
    setLoading(true);
    try {
      if (user) {
        console.log("Fetching reminders for user:", user.id);
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
          console.log("Fetched reminders:", data);
          setReminders(data as Reminder[]);
        }
      } else {
        // If not logged in, set empty reminders
        setReminders([]);
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
    console.log("RemindersPage initialized, fetching reminders");
    fetchReminders();
    
    // Set up real-time subscription
    if (user) {
      console.log("Setting up realtime subscription for user:", user.id);
      const channel = supabase
        .channel('reminders_channel')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'reminders',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log("Reminder change detected via realtime:", payload);
          fetchReminders();
        })
        .subscribe();
        
      return () => {
        console.log("Cleaning up realtime subscription");
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
      
      console.log("Checking for active reminders at:", currentDate, currentTime);
      
      reminders.forEach(reminder => {
        if (!reminder.completed && !activeReminders[reminder.id]) {
          if (reminder.date === currentDate && reminder.time === currentTime) {
            console.log("Active reminder found:", reminder);
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

  const createReminder = useCallback(async (reminderData: Omit<Reminder, 'id'>) => {
    if (!user) return;
    
    try {
      console.log("Creating reminder:", reminderData);
      
      // Add the reminder to the database
      const { error } = await supabase
        .from('reminders')
        .insert([{
          ...reminderData,
          user_id: user.id
        }]);
        
      if (error) {
        console.error("Error creating reminder in Supabase:", error);
        toast({
          title: "Error",
          description: "Could not create reminder. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log("Reminder created successfully");
        // Fetch updated reminders after successful creation
        fetchReminders();
      }
    } catch (error) {
      console.error("Error in createReminder:", error);
    }
  }, [user, toast, fetchReminders]);

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
      console.log("Snoozed reminder triggered again:", reminder);
      notifyReminder(
        reminder,
        () => handleToggleComplete(reminder),
        () => snoozeReminder(reminder)
      );
    }, 5 * 60 * 1000);
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    try {
      const newCompletedState = !reminder.completed;
      console.log("Toggling reminder completion:", reminder.id, "to", newCompletedState);
      
      const { error } = await supabase
        .from('reminders')
        .update({ completed: newCompletedState })
        .eq('id', reminder.id);
        
      if (error) {
        console.error("Error updating reminder in Supabase:", error);
        toast({
          title: "Error",
          description: "Could not update reminder. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log("Reminder updated successfully");
        if (!reminder.completed) {
          setActiveReminders(prev => {
            const newState = { ...prev };
            delete newState[reminder.id];
            return newState;
          });
        }
        // Fetch updated reminders
        fetchReminders();
      }
    } catch (error) {
      console.error("Error in handleToggleComplete:", error);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      console.log("Deleting reminder:", id);
      
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
        console.log("Reminder deleted successfully");
        setActiveReminders(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
        // Fetch updated reminders
        fetchReminders();
      }
    } catch (error) {
      console.error("Error in handleDeleteReminder:", error);
    }
  };

  // Process voice commands with duplicate prevention
  const { processVoiceCommand } = useReminderVoiceCommands({
    user,
    createReminder,
    listReminders: () => showReminderToast(reminders)
  });

  useEffect(() => {
    if (transcript && transcript !== lastProcessedTranscript) {
      console.log("Processing new voice command:", transcript);
      setLastProcessedTranscript(transcript);
      processVoiceCommand(transcript);
    }
  }, [transcript, processVoiceCommand, lastProcessedTranscript]);

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
