import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contract, InsertContract } from "@shared/schema";

export function useContracts() {
    const { toast } = useToast();

    const query = useQuery<Contract[]>({
        queryKey: [api.contracts.list.path],
    });

    const createMutation = useMutation({
        mutationFn: async (contract: InsertContract) => {
            const res = await fetch(api.contracts.create.path, {
                method: api.contracts.create.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contract),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Ushbu shartnomani saqlab bo'lmadi.");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.contracts.list.path] });
            toast({
                title: "Muvaffaqiyatli",
                description: "Yangi shartnoma saqlandi.",
            });
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Xato",
                description: error.message,
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(api.contracts.delete.path.replace(":id", String(id)), {
                method: api.contracts.delete.method,
            });
            if (!res.ok) throw new Error("Shartnomani o'chirib bo'lmadi.");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.contracts.list.path] });
            toast({
                title: "O'chirildi",
                description: "Shartnoma muvaffaqiyatli o'chirildi.",
            });
        },
    });

    return {
        contracts: query.data ?? [],
        isLoading: query.isLoading,
        createContract: createMutation,
        deleteContract: deleteMutation,
    };
}
