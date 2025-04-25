
import React from 'react';
import { format } from "date-fns";
import { Bell, Calendar, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Reminder } from "@/models";

interface ReminderListProps {
  reminders: Reminder[];
  onToggleComplete: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

const ReminderList: React.FC<ReminderListProps> = ({ 
  reminders, 
  onToggleComplete, 
  onDelete,
  loading
}) => {
  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (error) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-remindher-teal border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No reminders yet.</p>
        <p className="mt-2">Try saying "Set reminder for coffee on April 25th at 2:15 p.m., type once"</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5 text-remindher-teal" />
          Your Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                  onCheckedChange={() => onToggleComplete(reminder)}
                />
                <div>
                  <p className={`font-medium ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
                    {reminder.task_name}
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
                onClick={() => onDelete(reminder.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReminderList;
