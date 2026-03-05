import "dotenv/config";
import { db } from "./db";
import { clients, projects, tasks, timeEntries, transactions, invoices, users } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");
  
  // Seed Users if none
  const existingUsers = await db.select().from(users);
  let systemUserId = existingUsers[0]?.id;
  if (!systemUserId) {
    const [newUser] = await db.insert(users).values({
      email: "admin@saydx.uz",
      firstName: "Admin",
      lastName: "Saydx",
      role: "admin",
    }).returning();
    systemUserId = newUser.id;
  }

  // Seed Clients
  const existingClients = await db.select().from(clients);
  if (existingClients.length === 0) {
    const [client1] = await db.insert(clients).values({
      name: "Akmaljon",
      company: "TechCorp LLC",
      email: "akmal@techcorp.uz",
      phone: "+998901234567"
    }).returning();

    const [client2] = await db.insert(clients).values({
      name: "Dilnoza",
      company: "Design Studio",
      email: "dilnoza@design.uz",
      phone: "+998931234567"
    }).returning();

    // Seed Projects
    const [project1] = await db.insert(projects).values({
      name: "E-commerce Website",
      clientId: client1.id,
      type: "web",
      budget: "5000000",
      currency: "UZS",
      startDate: new Date(),
      deadlineDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      status: "active",
      progress: 35,
      paymentProgress: 50,
      riskLevel: "LOW"
    }).returning();

    const [project2] = await db.insert(projects).values({
      name: "Telegram Bot & CRM",
      clientId: client2.id,
      type: "bot",
      budget: "2500000",
      currency: "UZS",
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      deadlineDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Deadline passed
      status: "delayed",
      progress: 80,
      paymentProgress: 30,
      riskLevel: "HIGH"
    }).returning();

    // Seed Tasks (10 ta)
    const [task1] = await db.insert(tasks).values({
      projectId: project1.id,
      title: "Frontend dizaynini tasdiqlash",
      description: "Mijoz bilan UI/UX bo'yicha uchrashuv",
      priority: "high",
      status: "done",
      loggedMinutes: 120
    }).returning();

    const [task2] = await db.insert(tasks).values({
      projectId: project1.id,
      title: "Backend API yozish",
      description: "E-commerce uchun mahsulotlar API si",
      priority: "medium",
      status: "in progress",
      loggedMinutes: 300
    }).returning();

    const [task3] = await db.insert(tasks).values({
      projectId: project2.id,
      title: "Bot menyusini sozlash",
      description: "Asosiy buyruqlar va tugmalar",
      priority: "high",
      status: "todo",
      loggedMinutes: 0
    }).returning();

    await db.insert(tasks).values({
      projectId: project1.id,
      title: "Ma'lumotlar bazasi sxemasini yaratish",
      description: "Drizzle/PostgreSQL migratsiyalar",
      priority: "medium",
      status: "done",
      loggedMinutes: 90
    });
    await db.insert(tasks).values({
      projectId: project1.id,
      title: "To'lov integratsiyasi (Payme/Click)",
      description: "Checkout sahifa va webhook",
      priority: "high",
      status: "todo",
      loggedMinutes: 0
    });
    await db.insert(tasks).values({
      projectId: project1.id,
      title: "Admin panel",
      description: "Mahsulotlar va buyurtmalar boshqaruvi",
      priority: "medium",
      status: "todo",
      loggedMinutes: 0
    });
    await db.insert(tasks).values({
      projectId: project2.id,
      title: "CRM bilan ulash",
      description: "Mijozlar va leadlar sinxronizatsiya",
      priority: "medium",
      status: "in progress",
      loggedMinutes: 45
    });
    await db.insert(tasks).values({
      projectId: project2.id,
      title: "Xabarnomalar sozlash",
      description: "Telegram va email bildirishnomalar",
      priority: "low",
      status: "todo",
      loggedMinutes: 0
    });
    await db.insert(tasks).values({
      projectId: project1.id,
      title: "Test yozish va deploy",
      description: "E2E testlar va production deploy",
      priority: "high",
      status: "todo",
      loggedMinutes: 0
    });
    await db.insert(tasks).values({
      projectId: project2.id,
      title: "Dokumentatsiya",
      description: "Bot API va foydalanish bo'yicha qo'llanma",
      priority: "low",
      status: "todo",
      loggedMinutes: 0
    });

    // Seed Time Entries
    await db.insert(timeEntries).values({
      taskId: task1.id,
      userId: systemUserId,
      durationMinutes: 120,
      description: "Dizayn uchrashuvi",
      date: new Date()
    });

    await db.insert(timeEntries).values({
      taskId: task2.id,
      userId: systemUserId,
      durationMinutes: 300,
      description: "API yozildi",
      date: new Date()
    });

    // Seed Transactions
    await db.insert(transactions).values({
      projectId: project1.id,
      type: "income",
      amount: "2500000",
      currency: "UZS",
      category: "payment",
      description: "Oldindan to'lov",
      date: new Date()
    });

    await db.insert(transactions).values({
      type: "expense",
      amount: "500000",
      currency: "UZS",
      category: "server",
      description: "VPS server to'lovi",
      date: new Date()
    });

    // Seed Invoices
    await db.insert(invoices).values({
      projectId: project1.id,
      invoiceNumber: "INV-2024-001",
      amount: "2500000",
      currency: "UZS",
      status: "paid",
      dueDate: new Date(),
    });

    await db.insert(invoices).values({
      projectId: project2.id,
      invoiceNumber: "INV-2024-002",
      amount: "2500000",
      currency: "UZS",
      status: "unpaid",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
    });

    console.log("Database seeded successfully!");
  } else {
    console.log("Database already has data. Skipping seed.");
  }
}

seed().catch(console.error).finally(() => process.exit(0));
