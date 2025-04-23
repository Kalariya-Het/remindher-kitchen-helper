import React, { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Sector, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, RadialBarChart, RadialBar } from "recharts";
import dayjs from "dayjs";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["#2ed7c7", "#f7826f", "#79d2de", "#f7b267", "#9393fa", "#28c76f", "#ea5455", "#7e8ef1", "#ffb567", "#70a1ff"];

const FILTERS = {
  today: "Today",
  yesterday: "Yesterday", 
  thisweek: "This Week",
  completed: "Completed",
  pending: "Pending",
};

const PANTRY_FILTERS = {
  today: "Today",
  thisweek: "This Week",
  lowstock: "Low Stock",
  mostadded: "Most Added",
  mostused: "Most Used",
};

function getDateRange(filter: string) {
  const now = dayjs();
  switch (filter) {
    case "today": {
      return { from: now.startOf("day").toDate(), to: now.endOf("day").toDate() };
    }
    case "yesterday": {
      const y = now.subtract(1, "day");
      return { from: y.startOf("day").toDate(), to: y.endOf("day").toDate() };
    }
    case "thisweek": {
      return { from: now.startOf("week").toDate(), to: now.endOf("week").toDate() };
    }
    default:
      return {};
  }
}

const AnalysisPage = () => {
  const { isAuthenticated, user, profile } = useAuth();
  const [reminderFilter, setReminderFilter] = useState("today");
  const [taskFilter, setTaskFilter] = useState("today");
  const [pantryFilter, setPantryFilter] = useState("today");

  const remindersQ = useQuery({
    queryKey: ["analysis-reminders", user?.id, reminderFilter],
    queryFn: async () => {
      let query = supabase.from("reminders").select("*").eq("user_id", user!.id);
      if (reminderFilter === "completed") query = query.eq("completed", true);
      else if (reminderFilter === "pending") query = query.eq("completed", false);
      const dr = getDateRange(reminderFilter);
      if (dr.from && dr.to) query = query.gte("date", dr.from).lte("date", dr.to);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const tasksQ = useQuery({
    queryKey: ["analysis-tasks", user?.id, taskFilter],
    queryFn: async () => {
      let query = supabase.from("tasks").select("*").eq("user_id", user!.id);
      if (taskFilter === "completed") query = query.eq("completed", true);
      else if (taskFilter === "pending") query = query.eq("completed", false);
      const dr = getDateRange(taskFilter);
      if (dr.from && dr.to) query = query.gte("date", dr.from).lte("date", dr.to);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const pantryQ = useQuery({
    queryKey: ["analysis-pantry", user?.id],
    queryFn: async () => {
      const [items, logs] = await Promise.all([
        supabase.from("pantry_items").select("*").eq("user_id", user!.id),
        supabase.from("pantry_inventory_logs").select("*").eq("user_id", user!.id),
      ]);
      if (items.error) throw new Error(items.error.message);
      if (logs.error) throw new Error(logs.error.message);
      return { items: items.data ?? [], logs: logs.data ?? [] };
    },
    enabled: !!user,
  });

  const reminderStackedData = useMemo(() => {
    if (!remindersQ.data) return [];
    const set = remindersQ.data.length;
    const complete = remindersQ.data.filter(r => r.completed).length;
    const pending = set - complete;
    return [{ name: 'Reminders', Set: set, Completed: complete, Pending: pending }];
  }, [remindersQ.data]);

  const reminderTypePie = useMemo(() => {
    if (!remindersQ.data) return [];
    const map: any = {};
    remindersQ.data.forEach(r => { map[r.type] = (map[r.type] || 0) + 1; });
    return Object.entries(map).map(([type, value]: any, i) => ({
      name: String(type),
      value: Number(value),
      color: COLORS[i % COLORS.length],
    }));
  }, [remindersQ.data]);

  const tasksByMember = useMemo(() => {
    if (!tasksQ.data) return [];
    const map: any = {};
    tasksQ.data.forEach(t => { map[t.worker] = (map[t.worker] || 0) + 1; });
    return Object.entries(map).map(([member, assigned]: any, i) => ({ member, assigned, color: COLORS[i % COLORS.length] }));
  }, [tasksQ.data]);

  const taskCompletionRate = useMemo(() => {
    if (!tasksQ.data || !tasksQ.data.length) return 0;
    const total = tasksQ.data.length, done = tasksQ.data.filter(t => t.completed).length;
    return Math.round((done / total) * 100);
  }, [tasksQ.data]);

  const tasksOverTime = useMemo(() => {
    if (!tasksQ.data) return [];
    const m: Record<string, { date: string; total: number; completed: number }> = {};
    tasksQ.data.forEach(t => {
      const d = dayjs(t.date).format("YYYY-MM-DD");
      m[d] ??= { date: d, total: 0, completed: 0 };
      m[d].total++;
      if (t.completed) m[d].completed++;
    });
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
  }, [tasksQ.data]);

  const pantryTopUsed = useMemo(() => {
    if (!pantryQ.data) return [];
    const countMap: Record<string, { name: string; used: number }> = {};
    pantryQ.data.logs.filter((l: any) => l.type === "use").forEach(l => {
      const item = pantryQ.data.items.find((i: any) => i.id === l.pantry_item_id);
      if (item) {
        countMap[item.name] ??= { name: item.name, used: 0 };
        countMap[item.name].used += l.quantity;
      }
    });
    return Object.values(countMap).sort((a, b) => b.used - a.used).slice(0, 7);
  }, [pantryQ.data]);

  const pantryStockLevels = useMemo(() => {
    if (!pantryQ.data) return [];
    return pantryQ.data.items.map((i: any, idx: number) => ({
      name: i.name, quantity: i.quantity, color: COLORS[idx % COLORS.length],
      low: i.low_stock_threshold || 1
    }));
  }, [pantryQ.data]);

  const pantryLogsOverTime = useMemo(() => {
    if (!pantryQ.data) return [];
    const m: Record<string, number> = {};
    pantryQ.data.logs.forEach((l: any) => {
      const d = dayjs(l.logged_at).format("YYYY-MM-DD");
      m[d] = (m[d] || 0) + l.quantity;
    });
    return Object.entries(m).map(([date, qty]) => ({ date, qty: Number(qty) })).sort((a, b) => a.date.localeCompare(b.date));
  }, [pantryQ.data]);

  const FilterBar = ({ filters, value, setValue }: any) => (
    <div className="flex space-x-2 mb-4">
      {Object.entries(filters).map(([key, label]) =>
        <Button key={key} size="sm" variant={key === value ? "default" : "outline"} onClick={() => setValue(key)}>{label}</Button>
      )}
    </div>
  );

  if (!isAuthenticated) return <div className="p-10 text-center text-lg">Please login to view your analytics.</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-remindher-teal">📊 RemindHer Analysis</h1>
      <Tabs defaultValue="reminders" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="tasks">Task Assignment</TabsTrigger>
          <TabsTrigger value="pantry">Pantry</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders">
          <FilterBar filters={FILTERS} value={reminderFilter} setValue={setReminderFilter} />
          <div className="flex flex-wrap gap-6">
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Reminders Set vs Completed</CardTitle>
                <CardDescription>Bar: Set | Completed | Pending</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reminderStackedData} stackOffset="sign">
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Set" fill={COLORS[0]} />
                    <Bar dataKey="Completed" fill={COLORS[1]} />
                    <Bar dataKey="Pending" fill={COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Reminder Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={reminderTypePie}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={(entry: any): React.ReactNode => {
                        if (entry && typeof entry === "object" && "name" in entry && typeof entry.name === "string") {
                          return entry.name as string;
                        }
                        return "";
                      }}
                      dataKey="value"
                    >
                      {reminderTypePie.map((entry, idx) =>
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      )}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <FilterBar filters={FILTERS} value={taskFilter} setValue={setTaskFilter} />
          <div className="flex flex-wrap gap-6">
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Tasks Assigned per Member</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={tasksByMember}>
                    <XAxis dataKey="member" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="assigned">
                      {tasksByMember.map((v, idx) => <Cell key={v.member} fill={v.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Task Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart
                    innerRadius="70%" outerRadius="100%"
                    barSize={15}
                    data={[{ name: "Complete", value: taskCompletionRate }]}
                    startAngle={180} endAngle={-180}
                  >
                    <RadialBar dataKey="value" fill={COLORS[0]} />
                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center font-bold text-lg mt-2">{taskCompletionRate}%</div>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Tasks Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={tasksOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke={COLORS[2]} />
                    <Line type="monotone" dataKey="completed" stroke={COLORS[0]} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pantry">
          <FilterBar filters={PANTRY_FILTERS} value={pantryFilter} setValue={setPantryFilter} />
          <div className="flex flex-wrap gap-6">
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Top Used Pantry Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={pantryTopUsed}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="used" fill={COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Pantry Stock Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={pantryStockLevels}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity">
                      {pantryStockLevels.map((entry, idx) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[250px]">
              <CardHeader>
                <CardTitle>Inventory Updates Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={pantryLogsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="qty" stroke={COLORS[3]} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisPage;
