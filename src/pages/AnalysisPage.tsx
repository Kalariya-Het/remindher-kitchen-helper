
import React, { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { getReminders, getTasks, getPantryItems } from "@/services/storage";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const AnalysisPage = () => {
  const [timeRange, setTimeRange] = useState("all");
  const { user } = useAuth();

  // Fetch data from localStorage
  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: getReminders,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });

  const pantryItemsQuery = useQuery({
    queryKey: ["pantryItems"],
    queryFn: getPantryItems,
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
  const taskStats = useMemo(() => {
    if (tasksQuery.isLoading || !tasksQuery.data) return { completed: 0, pending: 0 };

    const tasks = tasksQuery.data;
    const filtered = tasks.filter((task) => filterByTime(task.date));

    const completed = filtered.filter((task) => task.completed).length;
    const pending = filtered.length - completed;

    return { completed, pending };
  }, [tasksQuery.data, timeRange]);

  // Calculate reminder completion stats
  const reminderStats = useMemo(() => {
    if (remindersQuery.isLoading || !remindersQuery.data) return { completed: 0, pending: 0, daily: 0, once: 0 };

    const reminders = remindersQuery.data;
    const filtered = reminders.filter((reminder) => filterByTime(reminder.date));

    const completed = filtered.filter((reminder) => reminder.completed).length;
    const pending = filtered.length - completed;
    const daily = filtered.filter((reminder) => reminder.type === "daily").length;
    const once = filtered.filter((reminder) => reminder.type === "once").length;

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
              onValueChange={(value) => setTimeRange(value)}
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
                            if (
                              entry &&
                              typeof entry === "object" &&
                              "name" in entry &&
                              typeof entry.name === "string"
                            ) {
                              return String(entry.name);
                            }
                            return "";
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
                            if (
                              entry &&
                              typeof entry === "object" &&
                              "name" in entry &&
                              typeof entry.name === "string"
                            ) {
                              return String(entry.name);
                            }
                            return "";
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
                          if (
                            entry &&
                            typeof entry === "object" &&
                            "name" in entry &&
                            typeof entry.name === "string"
                          ) {
                            return String(entry.name);
                          }
                          return "";
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
      </div>
    </Layout>
  );
};

export default AnalysisPage;
