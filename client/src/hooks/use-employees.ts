import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Employee = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    companyRole?: string;
};

export function useEmployees() {
    return useQuery<Employee[]>({
        queryKey: ["/api/employees"],
    });
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: Record<string, string>) => {
            const res = await fetch("/api/register-employee", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || "Xatolik yuz berdi");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Yangi xodim qo'shildi.",
            });
        },
        onError: (error) => {
            toast({
                title: "Xatolik",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<Employee> & { password?: string }) => {
            const res = await apiRequest("PUT", `/api/employees/${id}`, data);
            if (res.status === 204) return null;
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            queryClient.invalidateQueries({ queryKey: [`/api/employees/${variables.id}`] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Xodim ma'lumotlari yangilandi.",
            });
        },
        onError: (error) => {
            toast({
                title: "Xatolik",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiRequest("DELETE", `/api/employees/${id}`);
            if (res.status === 204) return null;
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            toast({
                title: "O'chirildi",
                description: "Xodim tizimdan o'chirildi.",
            });
        },
        onError: (error) => {
            toast({
                title: "Xatolik",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}
