import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type InsertTask = z.infer<typeof api.tasks.create.input>;
type UpdateTask = z.infer<typeof api.tasks.update.input>;

export function useTasks(projectId: number) {
  return useQuery({
    queryKey: [api.tasks.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.tasks.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Vazifalar yuklanmadi");
      return api.tasks.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
    retry: 2,
    retryDelay: 2000,
  });
}

export function useCreateTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTask) => {
      const url = buildUrl(api.tasks.create.path, { projectId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Vazifa yaratilmadi");
      return api.tasks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path, projectId] });
    },
  });
}

export function useUpdateTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateTask) => {
      const url = buildUrl(api.tasks.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Vazifa yangilanmadi");
      return api.tasks.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path, projectId] });
    },
  });
}

export function useLogTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, durationMinutes, description }: { taskId: number, durationMinutes: number, description?: string }) => {
      const url = buildUrl(api.timeEntries.create.path, { taskId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes, description }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Vaqt yozilmadi");
      return api.timeEntries.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      // Invalidate tasks to reflect updated logged_minutes
      queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
    }
  });
}
