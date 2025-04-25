
import { Reminder } from "@/models";
import { speakText } from "./speechSynthesis";
import { toast as sonnerToast } from "sonner";

export const notifyReminder = (reminder: Reminder, onComplete: () => void, onSnooze: () => void) => {
  speakText(`Reminder for ${reminder.task_name}`);
  
  sonnerToast("Reminder Time", {
    description: `It's time for: ${reminder.task_name}`,
    duration: 60000,
    className: "w-[400px] p-6 rounded-lg bg-gray-900 text-white font-medium",
    action: {
      label: "Complete",
      onClick: onComplete
    },
    cancel: {
      label: "Snooze 5m",
      onClick: onSnooze
    },
    onDismiss: onSnooze
  });
};

export const showReminderToast = (reminders: Reminder[]) => {
  if (reminders.length === 0) {
    sonnerToast("Reminders", {
      description: "You have no reminders set",
    });
  } else {
    const reminderSummary = reminders
      .slice(0, 3)
      .map(r => `${r.task_name} on ${r.date} at ${r.time}`)
      .join(", ");
    
    sonnerToast("Your Reminders", {
      description: reminderSummary + (reminders.length > 3 ? ` and ${reminders.length - 3} more` : ""),
    });
  }
};
