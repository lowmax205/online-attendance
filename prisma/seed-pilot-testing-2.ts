import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Get the appropriate database URL based on the environment
 */
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV;

  // If DATABASE_URL is set, use it (for local development and build)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

type ParsedStudent = {
  studentId: string;
  lastName: string;
  firstName: string;
};

type VerificationStatus = "Pending" | "Approved" | "Rejected";

/**
 * Determine verification status based on distance in meters
 * 0-20m: Approved
 * 20-80m: Pending
 * 80-100m: Rejected
 */
function getVerificationStatusByDistance(distance: number): VerificationStatus {
  if (distance <= 20) {
    return "Approved";
  } else if (distance <= 80) {
    return "Pending";
  } else if (distance <= 100) {
    return "Rejected";
  }
  return "Rejected"; // Default to rejected if beyond 100m
}

/**
 * Determine overall verification status based on both check-in and check-out distances
 * Uses the more restrictive status (Rejected > Pending > Approved)
 */
function getCombinedVerificationStatus(
  checkInDistance: number,
  checkOutDistance: number,
): VerificationStatus {
  // Enforce venue-centric thresholds strictly using actual distances:
  // - Approved only if BOTH CI and CO are within 20m
  // - Rejected if EITHER CI or CO is >= 80m
  // - Otherwise Pending (within 20-80m range)
  if (checkInDistance <= 20 && checkOutDistance <= 20) {
    return "Approved";
  }
  if (checkInDistance >= 80 || checkOutDistance >= 80) {
    return "Rejected";
  }
  return "Pending";
}

async function parseStudentsFromFile(
  fileRelativePath: string,
): Promise<ParsedStudent[]> {
  const filePath = path.resolve(process.cwd(), fileRelativePath);
  const raw = await readFile(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""));

  const students: ParsedStudent[] = [];
  const idRegex = /^\d{4}-\d{5}$/;

  for (let i = 0; i < lines.length; i++) {
    const idLine = lines[i];
    if (!idRegex.test(idLine)) continue;
    let j = i + 1;
    while (j < lines.length && lines[j] === "") j++;
    if (j >= lines.length) break;
    const nameLine = lines[j];
    const commaIdx = nameLine.indexOf(",");
    if (commaIdx === -1) continue;
    const lastName = nameLine.slice(0, commaIdx).trim();
    const firstName = nameLine.slice(commaIdx + 1).trim();

    students.push({ studentId: idLine, lastName, firstName });
    i = j;
  }

  return students;
}

async function main() {
  console.log(
    "🌱 Starting PILOT TESTING 2 seed: 7-day events with distance-based verification",
  );

  // Clear existing data
  console.log("🧹 Cleaning existing data...");
  await prisma.attendance.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.exportRecord.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.securityLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash passwords
  const studentPassword = await hash("Student123!", 10);
  const adminPassword = await hash("Admin@2025!", 10);

  // Create Administrator account
  console.log("👑 Creating Administrator account (admin@snsu.ph)...");
  const adminUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: "admin@snsu.ph",
      passwordHash: adminPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "Administrator",
      emailVerified: true,
      accountStatus: "ACTIVE",
      UserProfile: {
        create: {
          id: randomUUID(),
          updatedAt: new Date(),
          studentId: "2025-00001",
          department: "CCIS",
          course: "BSCS",
          yearLevel: 4,
          section: "A",
          campus: "MainCampus",
          contactNumber: "09051234567",
          documentUrls: [],
        },
      },
    },
  });

  // Parse students
  console.log("📄 Reading students from prisma/student_name.txt...");
  const students = await parseStudentsFromFile(
    path.join("prisma", "student_name.txt"),
  );
  console.log(`🎓 Found ${students.length} students`);

  // Create students
  let created = 0;
  const createdStudents: { id: string; email: string }[] = [];
  const emailCounts = new Map<string, number>();

  function toEmailForStudent(
    firstNameRaw: string,
    lastNameRaw: string,
  ): string {
    const initial = (firstNameRaw.match(/[A-Za-z]/)?.[0] || "").toLowerCase();
    const last = lastNameRaw
      .normalize("NFKD")
      .replace(/[^A-Za-z]/g, "")
      .toLowerCase();
    let base = `${initial}${last}`;
    if (!base) base = `student${Math.random().toString(36).slice(2, 8)}`;
    const count = (emailCounts.get(base) || 0) + 1;
    emailCounts.set(base, count);
    return count === 1 ? `${base}@snsu.edu.ph` : `${base}${count}@snsu.edu.ph`;
  }

  function randomPHNumber(): string {
    const prefixes = [
      "0905",
      "0906",
      "0915",
      "0916",
      "0917",
      "0920",
      "0921",
      "0922",
      "0923",
      "0927",
      "0928",
      "0929",
      "0935",
      "0936",
      "0937",
      "0945",
      "0946",
      "0947",
      "0951",
      "0956",
      "0961",
      "0966",
      "0967",
      "0977",
      "0978",
      "0979",
      "0981",
      "0991",
      "0992",
      "0994",
      "0995",
      "0997",
    ];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rest = String(Math.floor(Math.random() * 1_0000_0000)).padStart(
      7,
      "0",
    );
    return `${p}${rest}`;
  }

  for (const s of students) {
    const email = toEmailForStudent(s.firstName, s.lastName);
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        passwordHash: studentPassword,
        firstName: s.firstName,
        lastName: s.lastName,
        role: "Student",
        emailVerified: true,
        accountStatus: "ACTIVE",
        UserProfile: {
          create: {
            id: randomUUID(),
            updatedAt: new Date(),
            studentId: s.studentId,
            course: "BSCS",
            yearLevel: 4,
            section: "A",
            department: "CCIS",
            campus: "MainCampus",
            contactNumber: randomPHNumber(),
            documentUrls: [],
          },
        },
      },
    });
    created++;
    createdStudents.push({ id: user.id, email: user.email });
  }

  // Create 7 events (one for each day)
  console.log("\n📅 Creating 7-day pilot events...");
  const baseVenueLat = 9.787888575264288;
  const baseVenueLng = 125.4943942164429;
  const now = new Date();
  const meterDeg = 0.00009; // ≈ 10m per unit

  // Start from 3 weeks ago
  const startDaysAgo = 14 + Math.floor(Math.random() * 8);
  const baseDate = new Date(now);
  baseDate.setDate(baseDate.getDate() - startDaysAgo);
  baseDate.setHours(0, 0, 0, 0);

  let totalAttendanceCount = 0;

  // Helper to generate venue coordinates within 20 meters
  function getVenueCoordinatesWithOffset(baseLat: number, baseLng: number) {
    const twentyMetersInDegrees = 0.00018; // ≈ 20 meters
    const latOffset = (Math.random() - 0.5) * twentyMetersInDegrees;
    const lngOffset = (Math.random() - 0.5) * twentyMetersInDegrees;
    return {
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset,
    };
  }

  // Helper to generate distance with tuned distribution per check
  // Target overall (combined CI/CO): ~75-85% Approved, 10-20% Pending, ~5% Rejected
  // Per-check distribution is biased to hit targets after combination logic:
  //  - Approved: 89%
  //  - Pending: 8%
  //  - Rejected: 3%
  function getRandomDistance(): number {
    const rand = Math.random();
    if (rand < 0.89) {
      return Math.random() * 20; // Approved bucket (0-20m)
    } else if (rand < 0.97) {
      return 20 + Math.random() * 60; // Pending bucket (20-80m)
    } else {
      return 80 + Math.random() * 20; // Rejected bucket (80-100m)
    }
  }

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + dayOffset);

    const startDateTime = new Date(eventDate);
    startDateTime.setHours(9, 0, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + 2);

    // Generate venue coordinates with 20m offset from base
    const venueCoords = getVenueCoordinatesWithOffset(
      baseVenueLat,
      baseVenueLng,
    );
    const venueLat = venueCoords.lat;
    const venueLng = venueCoords.lng;

    // Create event
    const event = await prisma.event.create({
      data: {
        id: randomUUID(),
        eventCode: `PILOT-BSCS4A-D${dayOffset + 1}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`,
        name: `Pilot Testing for BSCS-4A - Day ${dayOffset + 1}`,
        description: `Pilot testing session for BSCS-4A students (Day ${dayOffset + 1} of 7) with distance-based verification.`,
        startDateTime,
        endDateTime,
        venueName: "EB302",
        venueAddress: "Surigao City",
        venueLatitude: venueLat,
        venueLongitude: venueLng,
        qrCodePayload: `attendance:pilot-bscs-4a-d${dayOffset + 1}:${Date.now()}:${Math.random()
          .toString(36)
          .slice(2, 10)}`,
        qrCodeUrl: "https://placehold.co/400x400.png?text=QR+BSCS-4A",
        status: "Completed",
        createdById: adminUser.id,
        updatedAt: new Date(),
      },
    });

    // Create attendance for each student with distance-based verification
    let eventAttendanceCount = 0;
    for (const student of createdStudents) {
      // Check-in within ±12.5 minutes around start
      const ci = new Date(startDateTime);
      const ciOffsetMs = (Math.random() - 0.5) * 25 * 60 * 1000;
      ci.setTime(ci.getTime() + ciOffsetMs);

      // Generate realistic distance distribution (meters) and derive coordinate offsets from it
      const distanceIn = getRandomDistance();
      const thetaIn = Math.random() * 2 * Math.PI; // random bearing
      const degPerMeter = 0.000009; // ~1e-5 deg ≈ 1m (approx)
      const rDegIn = distanceIn * degPerMeter;
      const latOffsetIn = rDegIn * Math.cos(thetaIn);
      const lngOffsetIn = rDegIn * Math.sin(thetaIn);

      // Check-out 1.5-2h after check-in
      const co = new Date(ci);
      const coOffsetMs = (90 + Math.random() * 30) * 60 * 1000;
      co.setTime(co.getTime() + coOffsetMs);

      const distanceOut = getRandomDistance();
      const thetaOut = Math.random() * 2 * Math.PI;
      const rDegOut = distanceOut * degPerMeter;
      const latOffsetOut = rDegOut * Math.cos(thetaOut);
      const lngOffsetOut = rDegOut * Math.sin(thetaOut);

      // Compute actual distances from coordinates to ensure consistency with map visualization
      function haversineMeters(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
      ): number {
        const R = 6371000; // meters
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      const actualCheckInDistance = haversineMeters(
        venueLat,
        venueLng,
        venueLat + latOffsetIn,
        venueLng + lngOffsetIn,
      );
      const actualCheckOutDistance = haversineMeters(
        venueLat,
        venueLng,
        venueLat + latOffsetOut,
        venueLng + lngOffsetOut,
      );

      const verificationStatus = getCombinedVerificationStatus(
        actualCheckInDistance,
        actualCheckOutDistance,
      );

      await prisma.attendance.create({
        data: {
          id: randomUUID(),
          eventId: event.id,
          userId: student.id,
          checkInSubmittedAt: ci,
          checkInLatitude: venueLat + latOffsetIn,
          checkInLongitude: venueLng + lngOffsetIn,
          checkInDistance: actualCheckInDistance,
          checkInFrontPhoto:
            "https://placehold.co/400x400.jpg?text=CheckIn-Front",
          checkInBackPhoto:
            "https://placehold.co/400x400.jpg?text=CheckIn-Back",
          checkInSignature:
            "https://placehold.co/400x200.png?text=Signature-In",
          checkOutSubmittedAt: co,
          checkOutLatitude: venueLat + latOffsetOut,
          checkOutLongitude: venueLng + lngOffsetOut,
          checkOutDistance: actualCheckOutDistance,
          checkOutFrontPhoto:
            "https://placehold.co/400x400.jpg?text=CheckOut-Front",
          checkOutBackPhoto:
            "https://placehold.co/400x400.jpg?text=CheckOut-Back",
          checkOutSignature:
            "https://placehold.co/400x200.png?text=Signature-Out",
          verificationStatus,
        },
      });
      eventAttendanceCount++;
    }

    totalAttendanceCount += eventAttendanceCount;
    console.log(
      `   ✓ Day ${dayOffset + 1}: ${event.name} (${eventAttendanceCount} attendance records)`,
    );
  }

  console.log("\n📊 PILOT TESTING 2 SEED SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`👤 Users created: ${created}`);
  console.log("   • Course: Computer Science");
  console.log("   • Year Level: 4");
  console.log("   • Section: A");
  console.log(`\n📅 Events created: 7 days of pilot testing`);
  console.log(`   • Start date: ${baseDate.toISOString().split("T")[0]}`);
  console.log(
    `   • Base venue: ${baseVenueLat.toFixed(6)}, ${baseVenueLng.toFixed(6)}`,
  );
  console.log(`   • Venue variation: ±500m (random coordinates per day)`);
  console.log(`\n📝 Distance-based Verification Distribution:`);
  console.log(`   • 0-20m (Approved): 40%  ✓`);
  console.log(`   • 20-80m (Pending): 35%  ⏳`);
  console.log(`   • 80-100m (Rejected): 25% ✗`);
  console.log(`\n📊 Total attendance records: ${totalAttendanceCount}`);
  console.log("\n🎉 Seed completed successfully!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
