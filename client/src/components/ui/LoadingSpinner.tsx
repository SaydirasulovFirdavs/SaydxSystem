import { Loader2 } from "lucide-react";

export function LoadingSpinner({ message = "Yuklanmoqda..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">{message}</p>
    </div>
  );
}
