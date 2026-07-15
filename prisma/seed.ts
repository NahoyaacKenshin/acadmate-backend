/**
 * Prisma Seed — Philippine Holidays 2026 & 2027
 * Covers Regular Holidays and Special Non-Working Days
 * as declared by Philippine law (RA 9849 + annual presidential proclamations).
 *
 * Run: npx prisma db seed
 */

import { HolidayType } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";

interface HolidayEntry {
  date: string; // ISO date string "YYYY-MM-DD"
  name: string;
  type: HolidayType;
}

const HOLIDAYS: HolidayEntry[] = [
  // ── 2026 Regular Holidays ──────────────────────────────────────────────────
  { date: "2026-01-01", name: "New Year's Day", type: HolidayType.REGULAR },
  { date: "2026-04-02", name: "Maundy Thursday", type: HolidayType.REGULAR },
  { date: "2026-04-03", name: "Good Friday", type: HolidayType.REGULAR },
  { date: "2026-04-09", name: "Araw ng Kagitingan (Day of Valor)", type: HolidayType.REGULAR },
  { date: "2026-05-01", name: "Labor Day", type: HolidayType.REGULAR },
  { date: "2026-06-12", name: "Independence Day", type: HolidayType.REGULAR },
  { date: "2026-08-31", name: "National Heroes Day", type: HolidayType.REGULAR },
  { date: "2026-11-30", name: "Bonifacio Day", type: HolidayType.REGULAR },
  { date: "2026-12-25", name: "Christmas Day", type: HolidayType.REGULAR },
  { date: "2026-12-30", name: "Rizal Day", type: HolidayType.REGULAR },

  // ── 2026 Special Non-Working Days ─────────────────────────────────────────
  { date: "2026-01-02", name: "New Year Holiday (Bridge Day)", type: HolidayType.SPECIAL },
  { date: "2026-02-05", name: "Chinese New Year (Year of the Horse)", type: HolidayType.SPECIAL },
  { date: "2026-02-25", name: "EDSA People Power Anniversary", type: HolidayType.SPECIAL },
  { date: "2026-04-04", name: "Black Saturday", type: HolidayType.SPECIAL },
  { date: "2026-08-21", name: "Ninoy Aquino Day", type: HolidayType.SPECIAL },
  { date: "2026-11-01", name: "All Saints' Day", type: HolidayType.SPECIAL },
  { date: "2026-11-02", name: "All Souls' Day", type: HolidayType.SPECIAL },
  { date: "2026-12-08", name: "Feast of the Immaculate Conception", type: HolidayType.SPECIAL },
  { date: "2026-12-24", name: "Christmas Eve", type: HolidayType.SPECIAL },
  { date: "2026-12-31", name: "New Year's Eve", type: HolidayType.SPECIAL },

  // ── 2027 Regular Holidays ──────────────────────────────────────────────────
  { date: "2027-01-01", name: "New Year's Day", type: HolidayType.REGULAR },
  { date: "2027-03-25", name: "Maundy Thursday", type: HolidayType.REGULAR },
  { date: "2027-03-26", name: "Good Friday", type: HolidayType.REGULAR },
  { date: "2027-04-09", name: "Araw ng Kagitingan (Day of Valor)", type: HolidayType.REGULAR },
  { date: "2027-05-01", name: "Labor Day", type: HolidayType.REGULAR },
  { date: "2027-06-12", name: "Independence Day", type: HolidayType.REGULAR },
  { date: "2027-08-30", name: "National Heroes Day", type: HolidayType.REGULAR },
  { date: "2027-11-30", name: "Bonifacio Day", type: HolidayType.REGULAR },
  { date: "2027-12-25", name: "Christmas Day", type: HolidayType.REGULAR },
  { date: "2027-12-30", name: "Rizal Day", type: HolidayType.REGULAR },

  // ── 2027 Special Non-Working Days ─────────────────────────────────────────
  { date: "2027-01-25", name: "Chinese New Year (Year of the Goat)", type: HolidayType.SPECIAL },
  { date: "2027-02-25", name: "EDSA People Power Anniversary", type: HolidayType.SPECIAL },
  { date: "2027-03-27", name: "Black Saturday", type: HolidayType.SPECIAL },
  { date: "2027-08-21", name: "Ninoy Aquino Day", type: HolidayType.SPECIAL },
  { date: "2027-11-01", name: "All Saints' Day", type: HolidayType.SPECIAL },
  { date: "2027-11-02", name: "All Souls' Day", type: HolidayType.SPECIAL },
  { date: "2027-12-08", name: "Feast of the Immaculate Conception", type: HolidayType.SPECIAL },
  { date: "2027-12-24", name: "Christmas Eve", type: HolidayType.SPECIAL },
  { date: "2027-12-31", name: "New Year's Eve", type: HolidayType.SPECIAL },
];

async function main() {
  console.log("🌱 Seeding Philippine holidays...");

  // Upsert each holiday by date+name to make the seed idempotent
  for (const holiday of HOLIDAYS) {
    const date = new Date(holiday.date + "T00:00:00.000Z");

    await prisma.philippineHoliday.upsert({
      where: {
        // Use a composite to prevent re-seeding duplicates
        date_name: { date, name: holiday.name },
      },
      update: {
        type: holiday.type,
      },
      create: {
        date,
        name: holiday.name,
        type: holiday.type,
      },
    });
  }

  console.log(`✅ Seeded ${HOLIDAYS.length} Philippine holidays (2026–2027).`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
