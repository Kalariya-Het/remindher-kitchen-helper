
import { Reminder, Task, PantryItem, Conversation } from "@/models";

// Reminders Storage
export const getReminders = (): Reminder[] => {
  const reminders = localStorage.getItem("remindher-reminders");
  return reminders ? JSON.parse(reminders) : [];
};

export const saveReminder = (reminder: Reminder): void => {
  const reminders = getReminders();
  reminders.push(reminder);
  localStorage.setItem("remindher-reminders", JSON.stringify(reminders));
};

export const updateReminder = (reminder: Reminder): void => {
  const reminders = getReminders();
  const index = reminders.findIndex(r => r.id === reminder.id);
  if (index !== -1) {
    reminders[index] = reminder;
    localStorage.setItem("remindher-reminders", JSON.stringify(reminders));
  }
};

export const deleteReminder = (id: string): void => {
  const reminders = getReminders();
  const filteredReminders = reminders.filter(r => r.id !== id);
  localStorage.setItem("remindher-reminders", JSON.stringify(filteredReminders));
};

// Tasks Storage
export const getTasks = (): Task[] => {
  const tasks = localStorage.getItem("remindher-tasks");
  return tasks ? JSON.parse(tasks) : [];
};

export const saveTask = (task: Task): void => {
  const tasks = getTasks();
  tasks.push(task);
  localStorage.setItem("remindher-tasks", JSON.stringify(tasks));
};

export const updateTask = (task: Task): void => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
    localStorage.setItem("remindher-tasks", JSON.stringify(tasks));
  }
};

export const deleteTask = (id: string): void => {
  const tasks = getTasks();
  const filteredTasks = tasks.filter(t => t.id !== id);
  localStorage.setItem("remindher-tasks", JSON.stringify(filteredTasks));
};

// Pantry Storage
export const getPantryItems = (): PantryItem[] => {
  const items = localStorage.getItem("remindher-pantry");
  return items ? JSON.parse(items) : [];
};

export const savePantryItem = (item: PantryItem): void => {
  const items = getPantryItems();
  items.push(item);
  localStorage.setItem("remindher-pantry", JSON.stringify(items));
};

export const updatePantryItem = (item: PantryItem): void => {
  const items = getPantryItems();
  const index = items.findIndex(i => i.id === item.id);
  if (index !== -1) {
    items[index] = item;
    localStorage.setItem("remindher-pantry", JSON.stringify(items));
  }
};

export const deletePantryItem = (id: string): void => {
  const items = getPantryItems();
  const filteredItems = items.filter(i => i.id !== id);
  localStorage.setItem("remindher-pantry", JSON.stringify(filteredItems));
};

// Conversation Storage
export const getConversations = (): Conversation[] => {
  const conversations = localStorage.getItem("remindher-conversations");
  return conversations ? JSON.parse(conversations) : [];
};

export const saveConversation = (conversation: Conversation): void => {
  const conversations = getConversations();
  conversations.push(conversation);
  localStorage.setItem("remindher-conversations", JSON.stringify(conversations));
};
