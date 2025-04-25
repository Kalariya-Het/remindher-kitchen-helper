
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getReminders, saveReminder, updateReminder, deleteReminder } from "@/services/storage";
import { Reminder } from "@/models";
import { useToast } from "@/components/ui/use-toast";
import { useVoice } from "@/contexts/VoiceContext";
import VoicePrompt from "@/components/VoicePrompt";
import { format, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Clock, Calendar, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const RemindersPage = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { transcript, voiceResponse } = useVoice();
  const { toast } = useToast();

  useEffect(() => {
    // Load saved reminders
    setReminders(getReminders());
  }, []);

  useEffect(() => {
    // Process voice commands for setting reminders
    if (!transcript) return;

    // Example: "Set reminder for laundry on April 10th at 3 PM, type once"
    const reminderMatch = transcript.match(/set reminder for (.*?) on (.*?) at (.*?)(?:,| type| type:) (daily|once)/i);

    if (reminderMatch) {
      const [, taskName, dateStr, timeStr, typeStr] = reminderMatch;
      
      try {
        // Try to parse the date more flexibly
        let dateObj;
        try {
          // First attempt - try direct new Date parsing
          dateObj = new Date(dateStr);
          if (isNaN(dateObj.getTime())) throw new Error("Invalid date format");
        } catch (e) {
          // Second attempt - try to parse month format like "May 10th"
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
        
        // Format the date to ISO format
        const dateFormatted = format(dateObj, "yyyy-MM-dd");
        
        // Create new reminder
        const newReminder: Reminder = {
          id: uuidv4(),
          taskName,
          date: dateFormatted,
          time: timeStr.trim(),
          type: typeStr.toLowerCase() as "daily" | "once",
          completed: false
        };
        
        console.log("Creating reminder:", newReminder);
        
        // Save reminder
        saveReminder(newReminder);
        
        // Update UI
        setReminders(getReminders());
        
        // Notify user
        toast({
          title: "Reminder Set",
          description: `Reminder for ${taskName} set for ${format(dateObj, "MMM d")} at ${timeStr}, ${typeStr}`,
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
      // Read out reminders
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
  }, [transcript]);

  const handleToggleComplete = (reminder: Reminder) => {
    const updatedReminder = { ...reminder, completed: !reminder.completed };
    updateReminder(updatedReminder);
    setReminders(getReminders());
  };

  const handleDeleteReminder = (id: string) => {
    deleteReminder(id);
    setReminders(getReminders());
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
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-remindher-teal" />
              Your Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No reminders yet.</p>
                <p className="mt-2">Try saying "Set reminder for laundry on April 10th at 3 PM, type once"</p>
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
