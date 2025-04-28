
// Reminder model
export interface Reminder {
  id: string;
  task_name: string; // Changed from taskName to match database schema
  date: string; // ISO string
  time: string; // 24 hour format, HH:MM
  type: "daily" | "once";
  completed: boolean;
  user_id?: string; // Added to match database schema
}

// Task assignment model
export interface Task {
  id: string;
  work: string;
  worker: string;
  completed: boolean;
  date: string; // ISO string
  user_id?: string; // Added to match database schema
}

// Pantry item model
export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  date: string; // ISO string
  time: string; // 24 hour format, HH:MM
  user_id?: string; // Added to match database schema
}

// Voice assistant conversation
export interface Conversation {
  id: string;
  userMessage: string;
  assistantMessage: string;
  timestamp: string; // ISO string
}
