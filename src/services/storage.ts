
import { Reminder, Task, PantryItem, Conversation } from "@/models";
import { supabase } from "@/integrations/supabase/client";

// Reminders Storage
export const getReminders = (): Reminder[] => {
  try {
    const reminders = localStorage.getItem("remindher-reminders");
    if (!reminders) return [];
    return JSON.parse(reminders);
  } catch (error) {
    console.error("Error getting reminders:", error);
    return [];
  }
};

export const saveReminder = (reminder: Reminder, shouldRefetch = true): void => {
  try {
    const reminders = getReminders();
    
    // Check for duplicates before adding
    if (!reminders.some(r => r.id === reminder.id)) {
      reminders.push(reminder);
      localStorage.setItem("remindher-reminders", JSON.stringify(reminders));
      console.log("Reminder saved successfully to local storage:", reminder);
    } else {
      console.warn("Duplicate reminder not saved to local storage:", reminder);
    }
  } catch (error) {
    console.error("Error saving reminder to local storage:", error);
  }
};

export const updateReminder = (reminder: Reminder, shouldRefetch = true): void => {
  try {
    const reminders = getReminders();
    const index = reminders.findIndex(r => r.id === reminder.id);
    if (index !== -1) {
      reminders[index] = reminder;
      localStorage.setItem("remindher-reminders", JSON.stringify(reminders));
      console.log("Reminder updated successfully in local storage:", reminder);
    } else {
      console.warn("Reminder not found for update in local storage:", reminder);
    }
  } catch (error) {
    console.error("Error updating reminder in local storage:", error);
  }
};

export const deleteReminder = (id: string, shouldRefetch = true): void => {
  try {
    const reminders = getReminders();
    const filteredReminders = reminders.filter(r => r.id !== id);
    localStorage.setItem("remindher-reminders", JSON.stringify(filteredReminders));
    console.log("Reminder deleted successfully from local storage:", id);
  } catch (error) {
    console.error("Error deleting reminder from local storage:", error);
  }
};

// Tasks Storage
export const getTasks = (): Task[] => {
  try {
    const tasks = localStorage.getItem("remindher-tasks");
    if (!tasks) return [];
    return JSON.parse(tasks);
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
};

export const saveTask = async (task: Task, user = null): Promise<void> => {
  try {
    // Try to save to Supabase if user is logged in
    if (user) {
      const { error } = await supabase
        .from('tasks')
        .insert({
          id: task.id,
          work: task.work,
          worker: task.worker,
          completed: task.completed,
          date: task.date,
          user_id: user.id
        });
        
      if (error) {
        console.error("Error saving task to Supabase:", error);
      }
    }
    
    // Also save to local storage as backup/offline access
    const tasks = getTasks();
    
    // Check for duplicates before adding
    if (!tasks.some(t => t.id === task.id)) {
      tasks.push(task);
      localStorage.setItem("remindher-tasks", JSON.stringify(tasks));
      console.log("Task saved successfully to local storage:", task);
    } else {
      console.warn("Duplicate task not saved to local storage:", task);
    }
  } catch (error) {
    console.error("Error saving task:", error);
  }
};

export const updateTask = async (task: Task, user = null): Promise<void> => {
  try {
    // Try to update in Supabase if user is logged in
    if (user) {
      const { error } = await supabase
        .from('tasks')
        .update({
          work: task.work,
          worker: task.worker,
          completed: task.completed,
          date: task.date
        })
        .eq('id', task.id);
        
      if (error) {
        console.error("Error updating task in Supabase:", error);
      }
    }
    
    // Also update in local storage
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index] = task;
      localStorage.setItem("remindher-tasks", JSON.stringify(tasks));
      console.log("Task updated successfully in local storage:", task);
    } else {
      console.warn("Task not found for update in local storage:", task);
    }
  } catch (error) {
    console.error("Error updating task:", error);
  }
};

export const deleteTask = async (id: string, user = null): Promise<void> => {
  try {
    // Try to delete from Supabase if user is logged in
    if (user) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting task from Supabase:", error);
      }
    }
    
    // Also delete from local storage
    const tasks = getTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);
    localStorage.setItem("remindher-tasks", JSON.stringify(filteredTasks));
    console.log("Task deleted successfully from local storage:", id);
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};

// Pantry Storage
export const getPantryItems = (): PantryItem[] => {
  try {
    const items = localStorage.getItem("remindher-pantry");
    if (!items) return [];
    return JSON.parse(items);
  } catch (error) {
    console.error("Error getting pantry items:", error);
    return [];
  }
};

export const savePantryItem = (item: PantryItem): void => {
  try {
    const items = getPantryItems();
    
    // Check for duplicates before adding
    if (!items.some(i => i.id === item.id)) {
      items.push(item);
      localStorage.setItem("remindher-pantry", JSON.stringify(items));
      console.log("Pantry item saved successfully:", item);
    } else {
      console.warn("Duplicate pantry item not saved:", item);
    }
  } catch (error) {
    console.error("Error saving pantry item:", error);
  }
};

export const updatePantryItem = (item: PantryItem): void => {
  try {
    const items = getPantryItems();
    const index = items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      items[index] = item;
      localStorage.setItem("remindher-pantry", JSON.stringify(items));
      console.log("Pantry item updated successfully:", item);
    } else {
      console.warn("Pantry item not found for update:", item);
    }
  } catch (error) {
    console.error("Error updating pantry item:", error);
  }
};

export const deletePantryItem = (id: string): void => {
  try {
    const items = getPantryItems();
    const filteredItems = items.filter(i => i.id !== id);
    localStorage.setItem("remindher-pantry", JSON.stringify(filteredItems));
    console.log("Pantry item deleted successfully:", id);
  } catch (error) {
    console.error("Error deleting pantry item:", error);
  }
};

// Conversation Storage
export const getConversations = (): Conversation[] => {
  try {
    const conversations = localStorage.getItem("remindher-conversations");
    if (!conversations) return [];
    return JSON.parse(conversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    return [];
  }
};

export const saveConversation = (conversation: Conversation): void => {
  try {
    const conversations = getConversations();
    
    // Check for duplicates before adding
    if (!conversations.some(c => c.id === conversation.id)) {
      conversations.push(conversation);
      localStorage.setItem("remindher-conversations", JSON.stringify(conversations));
      console.log("Conversation saved successfully");
    } else {
      console.warn("Duplicate conversation not saved");
    }
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
};
