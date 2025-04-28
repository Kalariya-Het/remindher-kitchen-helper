
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client"; 
import { Task } from "@/models";
import { useToast } from "@/components/ui/use-toast";
import { useVoice } from "@/contexts/VoiceContext";
import VoicePrompt from "@/components/VoicePrompt";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clipboard, Calendar, Trash2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { transcript } = useVoice();
  const { toast } = useToast();
  const { user } = useAuth();
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>("");

  // Fetch tasks from Supabase
  const fetchTasks = async () => {
    setLoading(true);
    try {
      if (user) {
        console.log("Fetching tasks for user:", user.id);
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) {
          console.error("Error fetching tasks from Supabase:", error);
          toast({
            title: "Error",
            description: "Could not fetch tasks. Please try again.",
            variant: "destructive",
          });
          setTasks([]);
        } else if (data) {
          console.log("Fetched tasks:", data);
          setTasks(data as Task[]);
        }
      } else {
        // If not logged in, set empty tasks
        setTasks([]);
      }
    } catch (error) {
      console.error("Error in fetchTasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize by fetching tasks
  useEffect(() => {
    console.log("TasksPage initialized, fetching tasks");
    fetchTasks();
    
    // Set up real-time subscription
    if (user) {
      console.log("Setting up realtime subscription for tasks, user:", user.id);
      const channel = supabase
        .channel('tasks_channel')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log("Task change detected via realtime:", payload);
          fetchTasks();
        })
        .subscribe();
        
      return () => {
        console.log("Cleaning up realtime subscription");
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    // Process voice commands for task assignment
    if (!transcript || transcript === lastProcessedTranscript) return;
    
    console.log("Processing new voice command for tasks:", transcript);
    setLastProcessedTranscript(transcript);

    // Example: "Assign cooking to cook"
    const taskMatch = transcript.match(/assign (.*?) to (.*)/i);

    if (taskMatch) {
      const [, work, worker] = taskMatch;
      
      if (!user) {
        toast({
          title: "Not Logged In",
          description: "Please log in to create tasks",
          variant: "destructive",
        });
        return;
      }
      
      // Create new task
      createTask(work.trim(), worker.trim());
    } else if (transcript.toLowerCase().includes("what tasks are assigned")) {
      // Read out tasks
      if (tasks.length === 0) {
        toast({
          title: "Tasks",
          description: "You have no tasks assigned",
        });
      } else {
        const taskSummary = tasks
          .slice(0, 3)
          .map(t => `${t.work} assigned to ${t.worker}`)
          .join(", ");
        
        toast({
          title: "Your Assigned Tasks",
          description: taskSummary + (tasks.length > 3 ? ` and ${tasks.length - 3} more` : ""),
        });
      }
    }
  }, [transcript]);

  // Create a task in Supabase
  const createTask = async (work: string, worker: string) => {
    if (!user) return;
    
    try {
      console.log("Creating task:", { work, worker });
      
      const newTask = {
        work,
        worker,
        completed: false,
        date: format(new Date(), "yyyy-MM-dd"),
        user_id: user.id
      };
      
      // Add to Supabase
      const { error } = await supabase
        .from('tasks')
        .insert([newTask]);
      
      if (error) {
        console.error("Error creating task in Supabase:", error);
        toast({
          title: "Error",
          description: "Could not create task. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log("Task created successfully");
        toast({
          title: "Task Assigned",
          description: `Assigned ${work} to ${worker}`,
        });
        
        // Fetch updated tasks
        fetchTasks();
      }
    } catch (error) {
      console.error("Error in createTask:", error);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newCompletedState = !task.completed;
      console.log("Toggling task completion:", task.id, "to", newCompletedState);
      
      const { error } = await supabase
        .from('tasks')
        .update({ completed: newCompletedState })
        .eq('id', task.id);
        
      if (error) {
        console.error("Error updating task in Supabase:", error);
        toast({
          title: "Error",
          description: "Could not update task. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log("Task updated successfully");
        // Fetch updated tasks
        fetchTasks();
      }
    } catch (error) {
      console.error("Error in handleToggleComplete:", error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      console.log("Deleting task:", id);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting task from Supabase:", error);
        toast({
          title: "Error",
          description: "Could not delete task. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log("Task deleted successfully");
        toast({
          title: "Task Deleted",
          description: "Your task has been removed",
        });
        // Fetch updated tasks
        fetchTasks();
      }
    } catch (error) {
      console.error("Error in handleDeleteTask:", error);
    }
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
        <h1 className="text-3xl font-bold mb-2">Task Assignment</h1>
        <p className="text-muted-foreground mb-6">Assign tasks to household workers</p>
        
        <VoicePrompt />
        
        {!user && (
          <div className="my-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-md">
            <p className="text-yellow-800 dark:text-yellow-200">
              You're not logged in. Sign in to save your tasks across devices.
            </p>
          </div>
        )}
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clipboard className="mr-2 h-5 w-5 text-remindher-coral" />
              Assigned Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-remindher-coral border-t-transparent rounded-full"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tasks assigned yet.</p>
                <p className="mt-2">Try saying "Assign cooking to cook"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`p-4 border rounded-lg flex items-center justify-between ${
                      task.completed ? "bg-muted/40" : "bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                      />
                      <div>
                        <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                          {task.work}
                        </p>
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5 mr-1" />
                          Assigned to: <span className="font-medium ml-1">{task.worker}</span>
                          <Calendar className="h-3.5 w-3.5 mx-1 ml-3" />
                          {formatDateDisplay(task.date)}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteTask(task.id)}
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
            <li className="text-sm">"Assign [work] to [worker]"</li>
            <li className="text-sm">"What tasks are assigned?"</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default TasksPage;
