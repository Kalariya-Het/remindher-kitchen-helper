
import React, { useEffect } from "react";
import { Reminder } from "@/models";
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

interface ReminderDialogProps {
  reminder: Reminder; 
  onComplete: () => void; 
  onSnooze: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const ReminderDialog: React.FC<ReminderDialogProps> = ({ 
  reminder, 
  onComplete, 
  onSnooze, 
  onClose,
  isOpen
}) => {
  useEffect(() => {
    // Auto-close after 5 minutes if no action is taken (but still snooze)
    const timeout = setTimeout(() => {
      onSnooze();
      onClose();
    }, 5 * 60 * 1000);
    
    return () => clearTimeout(timeout);
  }, [onSnooze, onClose]);
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl text-center">
            Reminder: {reminder.task_name}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            It&apos;s time for your scheduled reminder!
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

export default ReminderDialog;
