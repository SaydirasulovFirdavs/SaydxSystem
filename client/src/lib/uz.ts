/** Xavf darajasi (risk level) — interfeysda o'zbekcha */
export function riskLabel(level: string | null | undefined): string {
  if (!level) return "Past";
  switch (level.toUpperCase()) {
    case "HIGH": return "Yuqori";
    case "MEDIUM": return "O'rta";
    case "LOW": return "Past";
    default: return level;
  }
}

/** Vazifa holati (status) — interfeysda o'zbekcha */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  switch (status.toLowerCase()) {
    case "todo": return "Qilinishi kerak";
    case "in progress": return "Bajarilmoqda";
    case "done": return "Bajarildi";
    default: return status;
  }
}

/** Loyiha turi (project type) — interfeysda o'zbekcha */
export function typeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  switch (type.toLowerCase()) {
    case "google_sheets": return "Google Sheets";
    case "web": return "Web-sayt";
    case "bot": return "Telegram Bot";
    case "design": return "Dizayn";
    case "tolov_tizimlari": return "To'lov tizimlari";
    case "marketing": return "Marketing";
    default: return type;
  }
}

/** Muhimlik (priority) — interfeysda o'zbekcha */
export function priorityLabel(priority: string | null | undefined): string {
  if (!priority) return "—";
  switch (priority.toLowerCase()) {
    case "high": return "Yuqori";
    case "medium": return "O'rta";
    case "low": return "Past";
    default: return priority;
  }
}
