
import { Reminder } from "@/models";
import { speakText } from "./speechSynthesis";
import { toast as sonnerToast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as React from "react";
import * as ReactDOM from "react-dom";

// Create audio element for notification sound
let notificationSound: HTMLAudioElement;

try {
  notificationSound = new Audio('/notification-sound.mp3');
  // Pre-load the audio to ensure it's ready when needed
  notificationSound.load();
} catch (error) {
  console.error("Error loading notification sound:", error);
}

// Dialog component for reminder notifications
const ReminderDialog = ({ 
  reminder, 
  onComplete, 
  onSnooze,
  onClose
}: { 
  reminder: Reminder; 
  onComplete: () => void; 
  onSnooze: () => void;
  onClose: () => void;
}) => {
  React.useEffect(() => {
    // Auto-close after 5 minutes if no action is taken (but still snooze)
    const timeout = setTimeout(() => {
      onSnooze();
      onClose();
    }, 5 * 60 * 1000);
    
    return () => clearTimeout(timeout);
  }, [onSnooze, onClose]);
  
  return (
    <AlertDialog defaultOpen={true} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl text-center">
            Reminder: {reminder.task_name}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            It's time for your scheduled reminder!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-center gap-4">
          <AlertDialogCancel 
            onClick={onSnooze}
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Snooze 5 minutes
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onComplete}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Mark as Complete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Function to play notification sound with retry logic
const playSound = async () => {
  try {
    if (!notificationSound) {
      notificationSound = new Audio('/notification-sound.mp3');
    }
    
    // Reset the audio to the beginning
    notificationSound.currentTime = 0;
    
    // Play sound in a loop for 10 seconds or until stopped
    notificationSound.loop = true;
    
    const playPromise = notificationSound.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.error("Error playing notification sound:", err);
        // Try to reload and play again
        notificationSound.load();
        setTimeout(() => {
          notificationSound.play().catch(e => console.error("Second attempt failed:", e));
        }, 1000);
      });
    }
    
    // Stop looping after 10 seconds
    setTimeout(() => {
      notificationSound.loop = false;
    }, 10000);
    
  } catch (error) {
    console.error("Error with notification sound:", error);
  }
};

// Track active dialogs to prevent duplicates
const activeDialogs = new Set<string>();

export const notifyReminder = (reminder: Reminder, onComplete: () => void, onSnooze: () => void) => {
  // Prevent duplicate notifications for the same reminder
  if (activeDialogs.has(reminder.id)) {
    console.log("Notification for this reminder is already active");
    return;
  }
  
  // Play notification sound
  playSound();
  
  // Speak the reminder with detailed info
  speakText(`Reminder for ${reminder.task_name}`);
  
  // Show toast notification
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
  
  // Create dialog container if it doesn't exist
  let dialogContainer = document.getElementById('reminder-dialog-container');
  if (!dialogContainer) {
    dialogContainer = document.createElement('div');
    dialogContainer.id = 'reminder-dialog-container';
    document.body.appendChild(dialogContainer);
  }
  
  // Track this reminder as active
  activeDialogs.add(reminder.id);
  
  // Create and mount the dialog component
  const dialogRoot = document.createElement('div');
  dialogContainer.appendChild(dialogRoot);
  
  ReactDOM.render(
    <ReminderDialog 
      reminder={reminder} 
      onComplete={() => {
        onComplete();
        // Remove dialog after action
        dialogContainer?.removeChild(dialogRoot);
        activeDialogs.delete(reminder.id);
        // Stop sound
        if (notificationSound) {
          notificationSound.pause();
          notificationSound.currentTime = 0;
        }
      }}
      onSnooze={() => {
        onSnooze();
        // Remove dialog after action
        dialogContainer?.removeChild(dialogRoot);
        activeDialogs.delete(reminder.id);
        // Stop sound
        if (notificationSound) {
          notificationSound.pause();
          notificationSound.currentTime = 0;
        }
      }}
      onClose={() => {
        // Remove dialog when closed
        dialogContainer?.removeChild(dialogRoot);
        activeDialogs.delete(reminder.id);
        // Stop sound
        if (notificationSound) {
          notificationSound.pause();
          notificationSound.currentTime = 0;
        }
      }}
    />,
    dialogRoot
  );
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
