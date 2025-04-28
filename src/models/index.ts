
// Reminder model
export interface Reminder {
  id: string;
  task_name: string; // Match database column name
  date: string; // ISO string
  time: string; // 24 hour format, HH:MM
  type: "daily" | "once";
  completed: boolean;
  user_id?: string;
}

// Task assignment model
export interface Task {
  id: string;
  work: string;
  worker: string;
  completed: boolean;
  date: string; // ISO string
  user_id?: string;
}

// Pantry item model
export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  date: string; // ISO string
  time: string; // 24 hour format, HH:MM
  user_id?: string;
}

// Voice assistant conversation
export interface Conversation {
  id: string;
  userMessage: string;
  assistantMessage: string;
  timestamp: string; // ISO string
}
