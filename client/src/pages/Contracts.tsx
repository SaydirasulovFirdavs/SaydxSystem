import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contracts() {
  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Shartnomalar</h1>
          <p className="text-muted-foreground">Mijozlar bilan tuzilgan shartnomalarni boshqarish.</p>
        </div>
        <Button className="bg-secondary px-8 rounded-xl font-bold">
          <Plus className="w-5 h-5 mr-2" /> Yangi shartnoma
        </Button>
      </div>

      <div className="glass-panel rounded-3xl p-12 border border-white/5 text-center">
        <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ScrollText className="w-10 h-10 text-secondary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Shartnomalar mavjud emas</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-8">
          Hozircha tizimda hech qanday shartnoma mavjud emas. Birinchi shartnomani qo'shish uchun yuqoridagi tugmani bosing.
        </p>
      </div>
    </AppLayout>
  );
}
