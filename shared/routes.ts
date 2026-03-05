import { z } from 'zod';
import { 
  insertClientSchema, 
  insertCompanySchema,
  insertProjectSchema, 
  insertTaskSchema,
  insertTimeEntrySchema,
  insertTransactionSchema,
  insertInvoiceSchema,
  clients,
  companies,
  projects,
  tasks,
  timeEntries,
  transactions,
  invoices
} from './schema.js';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          activeProjects: z.number(),
          completedProjects: z.number(),
          delayedProjects: z.number(),
          totalRevenue: z.number(),
          totalExpenses: z.number(),
          netProfit: z.number(),
          totalHours: z.number(),
          averageHourlyRevenue: z.number(),
          monthlyStats: z.array(z.object({
            monthKey: z.string(),
            revenue: z.number(),
            expense: z.number(),
          })),
          deadlineRiskCount: z.number(),
          currencyRateSource: z.enum(["api", "manual", "fallback"]).optional(),
        }),
      }
    }
  },
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients' as const,
      responses: {
        200: z.array(z.custom<typeof clients.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients' as const,
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  companies: {
    list: {
      method: 'GET' as const,
      path: '/api/companies' as const,
      responses: {
        200: z.array(z.custom<typeof companies.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies' as const,
      input: insertCompanySchema,
      responses: {
        201: z.custom<typeof companies.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects' as const,
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id' as const,
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects' as const,
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/projects/:id' as const,
      input: insertProjectSchema.partial(),
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  },
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/tasks' as const,
      responses: {
        200: z.array(z.custom<typeof tasks.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/tasks' as const,
      input: insertTaskSchema.omit({ projectId: true }), // projectId is in path
      responses: {
        201: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/tasks/:id' as const,
      input: insertTaskSchema.partial(),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  timeEntries: {
    create: {
      method: 'POST' as const,
      path: '/api/tasks/:taskId/time-entries' as const,
      input: insertTimeEntrySchema.omit({ taskId: true, userId: true }),
      responses: {
        201: z.custom<typeof timeEntries.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  invoices: {
    list: {
      method: 'GET' as const,
      path: '/api/invoices' as const,
      responses: {
        200: z.array(z.custom<typeof invoices.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/invoices' as const,
      input: insertInvoiceSchema,
      responses: {
        201: z.custom<typeof invoices.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    generatePdf: {
      method: 'POST' as const,
      path: '/api/invoices/:id/generate-pdf' as const,
      responses: {
        200: z.object({ url: z.string() }),
        404: errorSchemas.notFound,
      }
    }
  },
  ai: {
    analyzeRisk: {
      method: 'POST' as const,
      path: '/api/projects/:id/analyze-risk' as const,
      responses: {
        200: z.object({
          riskLevel: z.string(),
          recommendation: z.string(),
        }),
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
