import { PrismaClient } from "@prisma/client";
import { addDays, setHours, setMinutes, format } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Resource Reservation Management System...");

  // Clean existing data
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();

  // Create 6 realistic demo resources
  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        name: "Executive Boardroom 4A",
        type: "ROOM",
        capacity: 24,
        description: "Equipped with 85-inch 4K dual conference display, polycom audio system, and whiteboards.",
        isActive: true,
      },
    }),
    prisma.resource.create({
      data: {
        name: "Design Sprint Studio",
        type: "ROOM",
        capacity: 12,
        description: "Agile collaboration room with mobile modular desks, smart project walls, and video recording kit.",
        isActive: true,
      },
    }),
    prisma.resource.create({
      data: {
        name: "Focus Pod Beta",
        type: "ROOM",
        capacity: 4,
        description: "Acoustic-treated soundproof pod for confidential client calls, interviews, and deep work.",
        isActive: true,
      },
    }),
    prisma.resource.create({
      data: {
        name: "Sony FX6 Cinema Camera Rig",
        type: "EQUIPMENT",
        capacity: 1,
        description: "Professional cinema camera kit including GM primes, wireless lavalier mics, and tripod.",
        isActive: true,
      },
    }),
    prisma.resource.create({
      data: {
        name: "DJI Inspire 3 Drone Kit",
        type: "EQUIPMENT",
        capacity: 1,
        description: "Full-frame 8K aerial capture kit with RTK positioning, license verified operators only.",
        isActive: true,
      },
    }),
    prisma.resource.create({
      data: {
        name: "Ford Transit Crew Van (EV)",
        type: "VEHICLE",
        capacity: 8,
        description: "Electric transport van for off-site client demos, equipment hauls, and events. 220km range.",
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${resources.length} resources.`);

  const now = new Date();
  const [boardroom, designStudio, focusPod, camera, drone, van] = resources;

  // Realistic seed reservations (15 bookings spanning today, yesterday, and upcoming days)
  const reservationsData = [
    // --- TODAY'S BOOKINGS ---
    {
      resourceId: boardroom.id,
      bookedBy: "Elena Rostova",
      purpose: "Q4 Executive Strategy & Budget Review",
      startTime: setMinutes(setHours(now, 9), 0),
      endTime: setMinutes(setHours(now, 11), 30),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: boardroom.id,
      bookedBy: "Michael Chang",
      purpose: "Investor Pitch & Product Showcase",
      startTime: setMinutes(setHours(now, 14), 0),
      endTime: setMinutes(setHours(now, 16), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: designStudio.id,
      bookedBy: "Aria Thorne",
      purpose: "UX Architecture & Wireframing Workshop",
      startTime: setMinutes(setHours(now, 10), 0),
      endTime: setMinutes(setHours(now, 13), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: focusPod.id,
      bookedBy: "Devon Miller",
      purpose: "Senior Engineering Candidate Interview",
      startTime: setMinutes(setHours(now, 11), 0),
      endTime: setMinutes(setHours(now, 12), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: camera.id,
      bookedBy: "Sofia Alvarez",
      purpose: "Brand Commercial & Founder Interview Shoot",
      startTime: setMinutes(setHours(now, 8), 0),
      endTime: setMinutes(setHours(now, 14), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: van.id,
      bookedBy: "Marcus Vance",
      purpose: "Tech Expo Booth Logistics Transport",
      startTime: setMinutes(setHours(now, 13), 0),
      endTime: setMinutes(setHours(now, 18), 0),
      status: "CONFIRMED" as const,
    },

    // --- TOMORROW'S BOOKINGS (UPCOMING) ---
    {
      resourceId: boardroom.id,
      bookedBy: "David Kim",
      purpose: "Monthly Engineering All-Hands",
      startTime: setMinutes(setHours(addDays(now, 1), 10), 0),
      endTime: setMinutes(setHours(addDays(now, 1), 12), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: designStudio.id,
      bookedBy: "Chloe Bennett",
      purpose: "Design System 3.0 Token Sync",
      startTime: setMinutes(setHours(addDays(now, 1), 14), 0),
      endTime: setMinutes(setHours(addDays(now, 1), 16), 30),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: drone.id,
      bookedBy: "Liam Walker",
      purpose: "Corporate Headquarters Architectural Video Survey",
      startTime: setMinutes(setHours(addDays(now, 1), 9), 0),
      endTime: setMinutes(setHours(addDays(now, 1), 13), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: focusPod.id,
      bookedBy: "Kavita Patel",
      purpose: "Quarterly Performance Alignment",
      startTime: setMinutes(setHours(addDays(now, 1), 15), 0),
      endTime: setMinutes(setHours(addDays(now, 1), 16), 0),
      status: "CONFIRMED" as const,
    },

    // --- DAY AFTER TOMORROW ---
    {
      resourceId: camera.id,
      bookedBy: "Sofia Alvarez",
      purpose: "Customer Case Study Studio Recording",
      startTime: setMinutes(setHours(addDays(now, 2), 11), 0),
      endTime: setMinutes(setHours(addDays(now, 2), 15), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: van.id,
      bookedBy: "Trevor Hall",
      purpose: "Regional Satellite Office IT Setup Shuttle",
      startTime: setMinutes(setHours(addDays(now, 2), 8), 30),
      endTime: setMinutes(setHours(addDays(now, 2), 17), 0),
      status: "CONFIRMED" as const,
    },

    // --- PAST & CANCELLED BOOKINGS (Realistic audit trail) ---
    {
      resourceId: boardroom.id,
      bookedBy: "Sarah Jenkins",
      purpose: "Client Contract Negotiation (Rescheduled)",
      startTime: setMinutes(setHours(now, 12), 0),
      endTime: setMinutes(setHours(now, 13), 30),
      status: "CANCELLED" as const,
    },
    {
      resourceId: designStudio.id,
      bookedBy: "Oliver Queen",
      purpose: "Marketing Campaign Brainstorm",
      startTime: setMinutes(setHours(addDays(now, -1), 9), 0),
      endTime: setMinutes(setHours(addDays(now, -1), 12), 0),
      status: "CONFIRMED" as const,
    },
    {
      resourceId: focusPod.id,
      bookedBy: "Devon Miller",
      purpose: "Vendor Procurement Sync",
      startTime: setMinutes(setHours(addDays(now, -1), 14), 0),
      endTime: setMinutes(setHours(addDays(now, -1), 15), 30),
      status: "CONFIRMED" as const,
    },
  ];

  for (const item of reservationsData) {
    await prisma.reservation.create({
      data: item,
    });
  }

  console.log(`Created ${reservationsData.length} reservations.`);
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
