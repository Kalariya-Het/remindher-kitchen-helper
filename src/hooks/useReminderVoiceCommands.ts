
import { useState, useCallback, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Reminder } from "@/models";

interface UseReminderVoiceCommandsProps {
  user: { id: string } | null;
  createReminder: (reminder: Omit<Reminder, 'id'>) => Promise<void>;
  listReminders: () => void;
}

export const useReminderVoiceCommands = ({ user, createReminder, listReminders }: UseReminderVoiceCommandsProps) => {
  const [processingVoice, setProcessingVoice] = useState(false);
  const [processingReminder, setProcessingReminder] = useState<string | null>(null);
  const lastProcessedCommand = useRef<string>('');
  const { toast } = useToast();

  const processVoiceCommand = useCallback(async (transcript: string) => {
    // Return early if already processing or transcript is the same as last processed
    if (!transcript || processingVoice || transcript === lastProcessedCommand.current) {
      return;
    }
    
    setProcessingVoice(true);
    // Store the current transcript to prevent duplicate processing
    lastProcessedCommand.current = transcript;

    try {
      const reminderMatch = transcript.match(/set reminder for (.*?) on (.*?) at (.*?)(?:,| type| type:) (daily|once)/i);
  
      if (reminderMatch) {
        const [, taskName, dateStr, timeStr, typeStr] = reminderMatch;
        const reminderKey = `${taskName}-${dateStr}-${timeStr}-${typeStr}`;
        
        if (reminderKey === processingReminder) {
          console.log("Already processing this reminder, skipping duplicate");
          return;
        }
        
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
          
          if (!user) {
            toast({
              title: "Not Logged In",
              description: "Please log in to create reminders",
              variant: "destructive",
            });
            return;
          }

          await createReminder({
            task_name: taskName,
            date: dateFormatted,
            time: timeFormatted,
            type: typeStr.toLowerCase() as "daily" | "once",
            completed: false,
            user_id: user.id
          });

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
        listReminders();
      }
    } finally {
      // Reset processing state after a slight delay
      setTimeout(() => {
        setProcessingVoice(false);
        setProcessingReminder(null);
      }, 1000);
    }
  }, [processingVoice, processingReminder, user, createReminder, listReminders, toast]);

  return {
    processVoiceCommand,
    processingVoice
  };
};
