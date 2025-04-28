
import { useState, useCallback, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Reminder } from "@/models";
import { supabase } from "@/integrations/supabase/client";
import { speakText } from "@/utils/speechSynthesis";
import { toast as sonnerToast } from "sonner";

interface UseReminderVoiceCommandsProps {
  user: { id: string } | null;
  createReminder: (reminder: Omit<Reminder, 'id'>) => Promise<void>;
  listReminders: () => void;
}

export const useReminderVoiceCommands = ({ user, createReminder, listReminders }: UseReminderVoiceCommandsProps) => {
  const [processingVoice, setProcessingVoice] = useState(false);
  const [processingReminder, setProcessingReminder] = useState<string | null>(null);
  const lastProcessedCommand = useRef<string>('');
  const processingTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const processVoiceCommand = useCallback(async (transcript: string) => {
    // Return early if already processing or transcript is the same as last processed
    if (!transcript || processingVoice || transcript === lastProcessedCommand.current) {
      console.log("Skipping voice processing due to:", 
        !transcript ? "empty transcript" : 
        processingVoice ? "already processing" : 
        "duplicate command");
      return;
    }
    
    console.log("Processing voice command for reminders:", transcript);
    setProcessingVoice(true);
    
    // Store the current transcript to prevent duplicate processing
    lastProcessedCommand.current = transcript;

    try {
      // Improved regex pattern to match various reminder formats
      // Match pattern: "set reminder for [task] on [date] at [time], type [daily|once]"
      // Also accept: "set reminder for [task] at [time] on [date], type [daily|once]"
      // Also accept: "set reminder for [task] at [time], type [daily|once]" (uses today's date)
      const reminderMatch = transcript.match(/set reminder for (.*?)(?:\s+on\s+(.*?))?(?:\s+at\s+(.*?))?(?:,|\s+type:?|\s+type\s+)(daily|once)/i);
      
      if (reminderMatch) {
        console.log("Reminder match found:", reminderMatch);
        const [, taskName, dateStr, timeStr, typeStr] = reminderMatch;
        const reminderKey = `${taskName}-${dateStr || 'today'}-${timeStr || '12:00'}-${typeStr}`;
        
        if (reminderKey === processingReminder) {
          console.log("Already processing this reminder, skipping duplicate");
          return;
        }
        
        setProcessingReminder(reminderKey);
        
        try {
          // Parse date - use today's date if not specified
          let dateObj;
          if (!dateStr || dateStr.trim() === '') {
            dateObj = new Date();
          } else {
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
          }
          
          const dateFormatted = format(dateObj, "yyyy-MM-dd");
          
          // Parse time - use current time if not specified
          let timeFormatted = timeStr ? timeStr.trim() : format(new Date(), "HH:mm");
          
          const timeTwelveHourMatch = timeFormatted.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
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
          
          if (!user) {
            toast({
              title: "Not Logged In",
              description: "Please log in to create reminders",
              variant: "destructive",
            });
            return;
          }

          // Create the reminder object
          const reminderData = {
            task_name: taskName,
            date: dateFormatted,
            time: timeFormatted,
            type: typeStr.toLowerCase() as "daily" | "once",
            completed: false,
            user_id: user.id
          };

          console.log("Creating reminder with data:", reminderData);

          // Call the createReminder function from parent component
          await createReminder(reminderData);

          // Provide immediate feedback to the user
          sonnerToast("Reminder Set", {
            description: `Reminder for ${taskName} set for ${format(dateObj, "MMM d")} at ${timeFormatted}`,
            className: "p-4 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800"
          });
          
          // Provide voice feedback
          speakText(`Reminder set for ${taskName}`);

        } catch (error) {
          console.error("Error parsing reminder:", error);
          toast({
            title: "Error Setting Reminder",
            description: "Please try again with a valid date and time format",
            variant: "destructive",
          });
        } finally {
          // Reset processing state for this specific reminder
          setProcessingReminder(null);
        }
      } else if (transcript.toLowerCase().includes("what are my reminders")) {
        listReminders();
      } else {
        console.log("No reminder command matched in transcript:", transcript);
      }
    } finally {
      // Reset processing state after a delay
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
      
      processingTimeout.current = setTimeout(() => {
        setProcessingVoice(false);
        processingTimeout.current = null;
      }, 2000); // Increased timeout to prevent rapid processing
    }
  }, [processingVoice, processingReminder, user, createReminder, listReminders, toast]);

  return {
    processVoiceCommand,
    processingVoice
  };
};
