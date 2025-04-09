
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getTasks, saveTask, updateTask, deleteTask } from "@/services/storage";
import { Task } from "@/models";
import { useToast } from "@/components/ui/use-toast";
import { useVoice } from "@/contexts/VoiceContext";
import VoicePrompt from "@/components/VoicePrompt";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clipboard, Calendar, Trash2, User } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { transcript } = useVoice();
  const { toast } = useToast();

  useEffect(() => {
    // Load saved tasks
    setTasks(getTasks());
  }, []);

  useEffect(() => {
    // Process voice commands for task assignment
    if (!transcript) return;

    // Example: "Assign cooking to cook"
    const taskMatch = transcript.match(/assign (.*?) to (.*)/i);

    if (taskMatch) {
      const [, work, worker] = taskMatch;
      
      // Create new task
      const newTask: Task = {
        id: uuidv4(),
        work: work.trim(),
        worker: worker.trim(),
        completed: false,
        date: format(new Date(), "yyyy-MM-dd")
      };
      
      // Save task
      saveTask(newTask);
      
      // Update UI
      setTasks(getTasks());
      
      // Notify user
      toast({
        title: "Task Assigned",
        description: `Assigned ${work} to ${worker}`,
      });
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

  const handleToggleComplete = (task: Task) => {
    const updatedTask = { ...task, completed: !task.completed };
    updateTask(updatedTask);
    setTasks(getTasks());
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    setTasks(getTasks());
    toast({
      title: "Task Deleted",
      description: "Your task has been removed",
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
        <h1 className="text-3xl font-bold mb-2">Task Assignment</h1>
        <p className="text-muted-foreground mb-6">Assign tasks to household workers</p>
        
        <VoicePrompt />
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clipboard className="mr-2 h-5 w-5 text-remindher-coral" />
              Assigned Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
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
