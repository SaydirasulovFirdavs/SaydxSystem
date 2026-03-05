import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  getMonth,
  getDate,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const OY_NOMLARI = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const HAFTA_QISQA = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [viewMode, setViewMode] = useState<"year" | "month">("year");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: events = [] } = useQuery({
    queryKey: ["/api/calendar/events"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/events", { credentials: "include" });
      if (!res.ok) throw new Error("Tadbirlar yuklanmadi");
      return res.json();
    },
  });

  type CalEvent = { id: string; projectId: number; title: string; date: string; type: "start" | "deadline"; status: string };
  const getEventsForDay = (day: Date) =>
    events.filter((e: CalEvent) => format(new Date(e.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));

  const hasStartOnDate = (y: number, m: number, d: number) =>
    events.some((e: CalEvent) => e.type === "start" && (() => { const ed = new Date(e.date); return ed.getFullYear() === y && ed.getMonth() === m && ed.getDate() === d; })());
  const hasDeadlineOnDate = (y: number, m: number, d: number) =>
    events.some((e: CalEvent) => e.type === "deadline" && (() => { const ed = new Date(e.date); return ed.getFullYear() === y && ed.getMonth() === m && ed.getDate() === d; })());
  const hasEventOnDate = (y: number, m: number, d: number) => hasStartOnDate(y, m, d) || hasDeadlineOnDate(y, m, d);

  // Yillik ko'rinish: 12 oy, har oyda bron qilingan kunlar belgilanadi
  const yearView = (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex flex-wrap justify-center gap-4">
        {OY_NOMLARI.map((oyNomi, monthIndex) => {
          const monthDate = new Date(selectedYear, monthIndex, 1);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const startPad = (monthStart.getDay() + 6) % 7;
          const padDays = Array.from({ length: startPad }, () => null);
          const allCells = [...padDays, ...days];
          const FULL_MONTH_CELLS = 42;
          const padded = allCells.length < FULL_MONTH_CELLS ? [...allCells, ...Array(FULL_MONTH_CELLS - allCells.length).fill(null)] : allCells;
          return (
            <button
              key={monthIndex}
              type="button"
              onClick={() => {
                setCurrent(new Date(selectedYear, monthIndex, 1));
                setViewMode("month");
              }}
              className="w-[calc(25%-12px)] min-w-[140px] max-w-[200px] rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-primary/40 hover:bg-primary/10 transition-all"
            >
              <div className="text-sm font-bold text-white mb-2">{oyNomi}</div>
              <div className="grid grid-cols-7 gap-0.5 text-[10px]">
                {HAFTA_QISQA.map(h => (
                  <div key={h} className="text-center text-white/40 font-medium py-0.5">{h}</div>
                ))}
                {padded.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />;
                  const hasStart = hasStartOnDate(selectedYear, monthIndex, getDate(day));
                  const hasDeadline = hasDeadlineOnDate(selectedYear, monthIndex, getDate(day));
                  const dayTitle =
                    hasStart || hasDeadline
                      ? `${format(day, "d MMMM")}${hasStart ? " (boshlanish)" : ""}${hasDeadline ? " (tugash)" : ""}`
                      : undefined;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center justify-center h-6 rounded text-[10px] text-white/80"
                      title={dayTitle}
                    >
                      <span className={hasStart || hasDeadline ? "font-semibold text-white" : "text-white/60"}>
                        {getDate(day)}
                      </span>
                      <span className="flex gap-0.5 mt-0.5">
                        {hasStart && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />}
                        {hasDeadline && <span className="w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (monthStart.getDay() + 6) % 7;
  const padDays = Array.from({ length: startPad }, () => null);

  const monthView = (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
        {HAFTA_QISQA.map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr min-h-[400px]">
        {padDays.map((_, i) => <div key={`pad-${i}`} className="border-b border-r border-white/5 bg-white/[0.02]" />)}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, current);
          return (
            <div
              key={day.toISOString()}
              className={`border-b border-r border-white/5 p-2 min-h-[80px] ${!isCurrentMonth ? "bg-black/20" : "bg-card/30"}`}
            >
              <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? "text-white" : "text-white/40"} ${isToday(day) ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((ev: CalEvent) => (
                  <Link key={ev.id} href={`/projects/${ev.projectId}`}>
                    <span
                      className={`block text-xs truncate px-1.5 py-0.5 rounded cursor-pointer ${ev.type === "start" ? "bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/50" : "bg-red-500/30 text-red-200 hover:bg-red-500/50"}`}
                    >
                      {ev.title} {ev.type === "start" ? "(boshlanish)" : "(tugash)"}
                    </span>
                  </Link>
                ))}
                {dayEvents.length > 4 && <span className="text-xs text-muted-foreground">+{dayEvents.length - 4}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Kalendar</h1>
          <p className="text-muted-foreground">Loyiha muddatlari va ish yuklamasi.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === "year" ? (
            <>
              <Button variant="outline" size="icon" className="border-white/20 text-white" onClick={() => setSelectedYear(y => y - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white font-semibold min-w-[80px] text-center">{selectedYear}</span>
              <Button variant="outline" size="icon" className="border-white/20 text-white" onClick={() => setSelectedYear(y => y + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70" onClick={() => setViewMode("month")}>
                <CalendarIcon className="w-4 h-4 mr-1" /> Oylik
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="border-white/20 text-white" onClick={() => setViewMode("year")}>
                <Grid3X3 className="w-4 h-4 mr-1" /> Yillik
              </Button>
              <Button variant="outline" size="icon" className="border-white/20 text-white" onClick={() => setCurrent(subMonths(current, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white font-semibold min-w-[180px] text-center">
                {OY_NOMLARI[getMonth(current)]} {current.getFullYear()}
              </span>
              <Button variant="outline" size="icon" className="border-white/20 text-white" onClick={() => setCurrent(addMonths(current, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {viewMode === "year" ? yearView : monthView}

      {viewMode === "year" && (
        <div className="mt-4 flex items-center gap-6 text-sm text-white/80">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-emerald-500/40" aria-hidden />
            Boshlanish sanasi
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-500/40" aria-hidden />
            Tugash sanasi (muddat)
          </span>
        </div>
      )}

      <div className="mt-6 glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" /> Yaqin muddatlar
        </h3>
        <ul className="space-y-3">
          {(events as CalEvent[])
            .filter((e) => e.type === "deadline" && new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 10)
            .map((e) => (
              <li key={e.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <Link href={`/projects/${e.projectId}`} className="text-white hover:text-primary font-medium">
                  {e.title}
                </Link>
                <span className="text-muted-foreground text-sm">{format(new Date(e.date), "dd.MM.yyyy")}</span>
              </li>
            ))}
        </ul>
      </div>
    </AppLayout>
  );
}
