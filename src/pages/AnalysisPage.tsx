
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Reminder, Task, PantryItem } from "@/models";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const AnalysisPage = () => {
  const [timeRange, setTimeRange] = useState("all");
  const { user } = useAuth();

  console.log("AnalysisPage: Current time range selected:", timeRange);
  console.log("AnalysisPage: Current user:", user);
  
  // Fetch reminders from Supabase
  const remindersQuery = useQuery({
    queryKey: ["reminders", user?.id, timeRange],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching reminders for analysis");
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Error fetching reminders:", error);
        return [];
      }
      
      console.log("Fetched reminders for analysis:", data);
      return data as Reminder[];
    },
    enabled: !!user,
  });

  // Fetch tasks from Supabase
  const tasksQuery = useQuery({
    queryKey: ["tasks", user?.id, timeRange],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching tasks for analysis");
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
      
      console.log("Fetched tasks for analysis:", data);
      return data as Task[];
    },
    enabled: !!user,
  });

  // Fetch pantry items from Supabase
  const pantryItemsQuery = useQuery({
    queryKey: ["pantryItems", user?.id, timeRange],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching pantry items for analysis");
      const { data, error } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Error fetching pantry items:", error);
        return [];
      }
      
      console.log("Fetched pantry items for analysis:", data);
      return data.map(item => ({
        id: item.id as string,
        name: item.name as string,
        quantity: String(item.quantity),
        date: format(new Date(item.created_at || new Date()), "yyyy-MM-dd"),
        time: format(new Date(item.created_at || new Date()), "HH:mm"),
        user_id: item.user_id as string
      })) as PantryItem[];
    },
    enabled: !!user,
  });

  // Apply time filter function
  const filterByTime = (date: string) => {
    const today = new Date();
    const itemDate = parseISO(date);

    switch (timeRange) {
      case "week":
        return isAfter(itemDate, subDays(today, 7));
      case "month":
        return isAfter(itemDate, subDays(today, 30));
      case "all":
      default:
        return true;
    }
  };

  // Calculate task completion stats
  const taskStats = React.useMemo(() => {
    if (tasksQuery.isLoading || !tasksQuery.data) return { completed: 0, pending: 0 };

    const tasks = tasksQuery.data;
    const filtered = tasks.filter((task) => filterByTime(task.date));

    const completed = filtered.filter((task) => task.completed).length;
    const pending = filtered.length - completed;

    console.log("Task stats calculated:", { completed, pending });
    return { completed, pending };
  }, [tasksQuery.data, timeRange]);

  // Calculate reminder completion stats
  const reminderStats = React.useMemo(() => {
    if (remindersQuery.isLoading || !remindersQuery.data) return { completed: 0, pending: 0, daily: 0, once: 0 };

    const reminders = remindersQuery.data;
    const filtered = reminders.filter((reminder) => filterByTime(reminder.date));

    const completed = filtered.filter((reminder) => reminder.completed).length;
    const pending = filtered.length - completed;
    const daily = filtered.filter((reminder) => reminder.type === "daily").length;
    const once = filtered.filter((reminder) => reminder.type === "once").length;

    console.log("Reminder stats calculated:", { completed, pending, daily, once });
    return { completed, pending, daily, once };
  }, [remindersQuery.data, timeRange]);

  // Prepare chart data
  const taskChartData = [
    { name: "Completed", value: taskStats.completed },
    { name: "Pending", value: taskStats.pending },
  ].filter((entry) => entry.value > 0);

  const reminderChartData = [
    { name: "Completed", value: reminderStats.completed },
    { name: "Pending", value: reminderStats.pending },
  ].filter((entry) => entry.value > 0);

  const reminderTypeData = [
    { name: "Daily", value: reminderStats.daily },
    { name: "Once", value: reminderStats.once },
  ].filter((entry) => entry.value > 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track your household management metrics
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <Select
              value={timeRange}
              onValueChange={(value) => {
                console.log("Time range changed to:", value);
                setTimeRange(value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!user ? (
          <div className="my-8 p-6 bg-yellow-100 dark:bg-yellow-900 rounded-md text-center">
            <h2 className="text-xl font-medium mb-2 text-yellow-800 dark:text-yellow-200">
              Login Required
            </h2>
            <p className="text-yellow-700 dark:text-yellow-300">
              Please log in to view your personal analytics dashboard
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Reminders</CardTitle>
                  <CardDescription>Total reminder tracking</CardDescription>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-3xl font-bold">
                    {reminderStats.completed + reminderStats.pending}
                  </div>
                  <div className="flex mt-2 gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {reminderStats.completed} Completed
                    </Badge>
                    {reminderStats.pending > 0 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {reminderStats.pending} Pending
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Tasks</CardTitle>
                  <CardDescription>Assigned task progress</CardDescription>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-3xl font-bold">
                    {taskStats.completed + taskStats.pending}
                  </div>
                  <div className="flex mt-2 gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {taskStats.completed} Completed
                    </Badge>
                    {taskStats.pending > 0 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {taskStats.pending} Pending
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Pantry Items</CardTitle>
                  <CardDescription>Items in inventory</CardDescription>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="text-3xl font-bold">
                    {pantryItemsQuery.data?.length || 0}
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    Last updated: {pantryItemsQuery.data && pantryItemsQuery.data.length > 0
                      ? format(
                          new Date(
                            Math.max(
                              ...pantryItemsQuery.data.map((item) =>
                                new Date(item.date).getTime()
                              )
                            )
                          ),
                          "MMM d, yyyy"
                        )
                      : "Never"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="reminders" className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="reminders">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reminder Completion</CardTitle>
                      <CardDescription>Completed vs pending reminders</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reminderChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={reminderChartData}
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              label={(entry: any): React.ReactNode => {
                                return entry?.name ? String(entry.name) : "";
                              }}
                              dataKey="value"
                            >
                              {reminderChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Reminder Types</CardTitle>
                      <CardDescription>Distribution of reminder types</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reminderTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={reminderTypeData}
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              label={(entry: any): React.ReactNode => {
                                return entry?.name ? String(entry.name) : "";
                              }}
                              dataKey="value"
                            >
                              {reminderTypeData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="tasks">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Completion</CardTitle>
                    <CardDescription>Completed vs pending tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {taskChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={taskChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry: any): React.ReactNode => {
                              return entry?.name ? String(entry.name) : "";
                            }}
                            dataKey="value"
                          >
                            {taskChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-muted-foreground">No data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnalysisPage;
