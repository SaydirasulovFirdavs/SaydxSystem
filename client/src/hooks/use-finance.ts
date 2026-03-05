import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type InsertTransaction = z.infer<typeof api.transactions.create.input>;
type InsertInvoice = z.infer<typeof api.invoices.create.input>;

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Tranzaksiyalar yuklanmadi");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const res = await fetch(api.transactions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Tranzaksiya yaratilmadi");
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: [api.invoices.list.path],
    queryFn: async () => {
      const res = await fetch(api.invoices.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Fakturalar yuklanmadi");
      return api.invoices.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const res = await fetch(api.invoices.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Faktura yaratishda xato.");
      }
      return api.invoices.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Faktura yangilanmadi.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}

export function useInvoiceItems(invoiceId: number | null) {
  return useQuery({
    queryKey: ["/api/invoices", invoiceId, "items"],
    queryFn: async () => {
      if (!invoiceId) return [];
      const res = await fetch(`/api/invoices/${invoiceId}/items`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!invoiceId,
  });
}

export function useAddInvoiceItem(invoiceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; quantity: number; unitPrice: string; serviceType?: "row" | "server" | "api"; startDate?: string; projectId?: number }) => {
      const res = await fetch(`/api/invoices/${invoiceId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Xizmat qoʻshilmadi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}

export function useDeleteInvoiceItem(invoiceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: number) => {
      const res = await fetch(`/api/invoices/${invoiceId}/items/${itemId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Xizmat oʻchirilmadi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}
