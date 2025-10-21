import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";
import { SCHEMA_STATEMENTS } from "../database/schema.js";
import { env } from "../config/env.js";
import { seedFullDemo } from "./seed-full-demo.js";

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :n LIMIT 1`,
    { n: name },
  );
  return Array.isArray(rows) && (rows as { TABLE_NAME: string }[]).length > 0;
}

/** Adds `is_active` when upgrading an older database that was created before this column existed */
async function ensureUsersIsActiveColumn(pool: Pool): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'`,
  );
  const c = Number((rows[0] as RowDataPacket)?.c ?? 0);
  if (c === 0) {
    await pool.query(
      `ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER verified_payment`,
    );
  }
}

async function ensureUsersMarketplaceColumns(pool: Pool): Promise<void> {
  const addIfMissing = async (column: string, ddl: string) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = :column`,
      { column },
    );
    const c = Number((rows[0] as RowDataPacket)?.c ?? 0);
    if (c === 0) await pool.query(`ALTER TABLE users ADD COLUMN ${ddl}`);
  };

  await addIfMissing("username", "username VARCHAR(64) NULL UNIQUE");
  await addIfMissing("national_id", "national_id VARCHAR(128) NULL");
  await addIfMissing(
    "id_front_image_url",
    "id_front_image_url VARCHAR(768) NULL",
  );
  await addIfMissing(
    "id_back_image_url",
    "id_back_image_url VARCHAR(768) NULL",
  );
  await addIfMissing(
    "profile_picture_url",
    "profile_picture_url VARCHAR(768) NULL",
  );
  await addIfMissing("short_bio", "short_bio TEXT NULL");
  await addIfMissing("social_links_json", "social_links_json JSON NULL");
  await addIfMissing(
    "verification_status",
    `verification_status VARCHAR(24) NOT NULL DEFAULT 'pending'`,
  );
  await addIfMissing(
    "paid_verification_badge",
    "paid_verification_badge TINYINT(1) NOT NULL DEFAULT 0",
  );
  await addIfMissing(
    "wallet_account_no",
    "wallet_account_no VARCHAR(32) NULL UNIQUE",
  );
  await addIfMissing("coins", "coins INT NOT NULL DEFAULT 0");
  await addIfMissing("google_id", "google_id VARCHAR(255) NULL UNIQUE");
}

async function ensureUsersOnboardingProfileColumns(pool: Pool): Promise<void> {
  const addIfMissing = async (column: string, ddl: string) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = :column`,
      { column },
    );
    const c = Number((rows[0] as RowDataPacket)?.c ?? 0);
    if (c === 0) await pool.query(`ALTER TABLE users ADD COLUMN ${ddl}`);
  };

  await addIfMissing("personal_profile_json", "personal_profile_json JSON NULL");
  await addIfMissing(
    "onboarding_profile_status",
    `onboarding_profile_status VARCHAR(16) NOT NULL DEFAULT 'skipped'`,
  );
}

async function ensureDigitalProductsDeliveryColumns(pool: Pool): Promise<void> {
  if (!(await tableExists(pool, "digital_products"))) return;
  const addIfMissing = async (column: string, ddl: string) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'digital_products' AND COLUMN_NAME = :column`,
      { column },
    );
    const c = Number((rows[0] as RowDataPacket)?.c ?? 0);
    if (c === 0)
      await pool.query(`ALTER TABLE digital_products ADD COLUMN ${ddl}`);
  };

  await addIfMissing(
    "full_description",
    `full_description TEXT NULL AFTER description`,
  );
  await addIfMissing(
    "promotion_sample_url",
    `promotion_sample_url VARCHAR(768) NULL AFTER full_description`,
  );
}

async function ensureReviewsJobIdColumn(pool: Pool): Promise<void> {
  if (!(await tableExists(pool, "reviews"))) return;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'job_id'`,
  );
  const c = Number((rows[0] as RowDataPacket)?.c ?? 0);
  if (c === 0) {
    await pool.query(
      `ALTER TABLE reviews ADD COLUMN job_id VARCHAR(36) NULL AFTER service_order_id`,
    );
    await pool.query(`ALTER TABLE reviews ADD INDEX idx_rev_job (job_id)`);
    await pool.query(
      `ALTER TABLE reviews ADD CONSTRAINT fk_rev_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL`,
    );
  }
}

async function ensureMessagesAttachmentColumns(pool: Pool): Promise<void> {
  if (!(await tableExists(pool, "messages"))) return;
  const addIfMissing = async (column: string, ddl: string) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = :column`,
      { column },
    );
    const c = Number((rows[0] as RowDataPacket)?.c ?? 0);
    if (c === 0) await pool.query(`ALTER TABLE messages ADD COLUMN ${ddl}`);
  };

  await addIfMissing(
    "attachment_storage_path",
    `attachment_storage_path VARCHAR(768) NULL AFTER body`,
  );
  await addIfMissing(
    "attachment_original_name",
    `attachment_original_name VARCHAR(255) NULL AFTER attachment_storage_path`,
  );
}

async function seedIfEmpty(pool: Pool): Promise<void> {
  const [rows] = await pool.query(`SELECT COUNT(*) AS c FROM users`);
  const c = (rows as { c: number }[])[0]?.c ?? 0;
  if (c > 0) return;

  const adminHash = await bcrypt.hash(env.seed.founderPassword, 10);
  const now = new Date();

  // Single merged administrator account (super-admin role).
  // Replaces the older split between `founder@…` and `admin@…` rows.
  const users: Array<Record<string, unknown>> = [
    {
      id: "seed-admin-1",
      email: env.seed.founderEmail.toLowerCase(),
      password_hash: adminHash,
      name: "Administrator",
      role: "super-admin",
      verified: 1,
      is_active: 1,
      phone: "+251900000001",
    },
  ];

  for (const u of users) {
    const skillsJson = typeof u.skills_json === "string" ? u.skills_json : "[]";
    await pool.execute(
      `INSERT INTO users (
        id, email, google_id, password_hash, name, role, phone, verified, created_at,
        bio, skills_json, hourly_rate, rating, completed_projects, earnings, location, profile_complete,
        company, industry, verified_payment, is_active
      ) VALUES (
        :id, :email, :google_id, :password_hash, :name, :role, :phone, :verified, :created_at,
        :bio, :skills_json, :hourly_rate, :rating, :completed_projects, :earnings, :location, :profile_complete,
        :company, :industry, :verified_payment, :is_active
      )`,
      {
        id: u.id,
        email: u.email,
        google_id: null,
        password_hash: u.password_hash,
        name: u.name,
        role: u.role,
        phone: u.phone ?? null,
        verified: u.verified ?? 0,
        created_at: now,
        bio: (u.bio as string) ?? null,
        skills_json: skillsJson,
        hourly_rate: u.hourly_rate ?? 0,
        rating: u.rating ?? 0,
        completed_projects: u.completed_projects ?? 0,
        earnings: u.earnings ?? 0,
        location: (u.location as string) ?? "",
        profile_complete: u.profile_complete ?? 30,
        company: (u.company as string) ?? "",
        industry: (u.industry as string) ?? "",
        verified_payment: u.verified_payment ?? 0,
        is_active: u.is_active ?? 1,
      },
    );
  }
}

async function seedFreelancersAndJobs(pool: Pool): Promise<void> {
  const [jobCountRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM jobs`,
  );
  const jobCount = Number((jobCountRows[0] as RowDataPacket)?.c ?? 0);

  const demoPasswordHash = await bcrypt.hash("SeedUser2026!", 10);
  const now = new Date();

  const demoFreelancers = [
    {
      id: "seed-freelancer-1",
      email: "freelancer1@eliteethiopia.com",
      name: "Top Freelancer - Beba M.",
      bio: "Full-stack web developer focused on marketplace and dashboard apps.",
      skills_json: JSON.stringify(["React", "Next.js", "Node.js", "MySQL"]),
      hourly_rate: 35,
      rating: 4.95,
      completed_projects: 64,
      earnings: 125000,
      location: "Addis Ababa",
      industry: "Software",
    },
    {
      id: "seed-freelancer-2",
      email: "freelancer2@eliteethiopia.com",
      name: "Hana T.",
      bio: "UI/UX and product designer for web and mobile teams.",
      skills_json: JSON.stringify(["Figma", "UI Design", "Design Systems"]),
      hourly_rate: 18,
      rating: 4.8,
      completed_projects: 28,
      earnings: 42000,
      location: "Bahir Dar",
      industry: "Design",
    },
    {
      id: "seed-freelancer-3",
      email: "freelancer3@eliteethiopia.com",
      name: "Samuel K.",
      bio: "Digital marketer helping brands scale performance campaigns.",
      skills_json: JSON.stringify(["Google Ads", "SEO", "Content Marketing"]),
      hourly_rate: 15,
      rating: 4.7,
      completed_projects: 19,
      earnings: 28000,
      location: "Hawassa",
      industry: "Marketing",
    },
  ] as const;

  const freelancerIdByEmail = new Map<string, string>();

  for (const f of demoFreelancers) {
    const [existingRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE id = :seedId OR LOWER(email) = LOWER(:email) LIMIT 1`,
      { seedId: f.id, email: f.email },
    );
    const existingId = (existingRows[0]?.id as string | undefined) ?? null;

    if (existingId) {
      freelancerIdByEmail.set(f.email.toLowerCase(), existingId);
      await pool.execute(
        `UPDATE users SET
          password_hash = :password_hash,
          name = :name,
          role = 'freelancer',
          is_active = 1,
          verified = 1,
          bio = :bio,
          skills_json = :skills_json,
          hourly_rate = :hourly_rate,
          rating = :rating,
          completed_projects = :completed_projects,
          earnings = :earnings,
          location = :location,
          profile_complete = :profile_complete,
          industry = :industry,
          verified_payment = 1
         WHERE id = :id`,
        {
          id: existingId,
          password_hash: demoPasswordHash,
          name: f.name,
          bio: f.bio,
          skills_json: f.skills_json,
          hourly_rate: f.hourly_rate,
          rating: f.rating,
          completed_projects: f.completed_projects,
          earnings: f.earnings,
          location: f.location,
          profile_complete: 90,
          industry: f.industry,
        },
      );
    } else {
      freelancerIdByEmail.set(f.email.toLowerCase(), f.id);
      await pool.execute(
        `INSERT INTO users (
          id, email, google_id, password_hash, name, role, phone, verified, created_at,
          bio, skills_json, hourly_rate, rating, completed_projects, earnings, location, profile_complete,
          company, industry, verified_payment, is_active
        ) VALUES (
          :id, :email, :google_id, :password_hash, :name, 'freelancer', :phone, 1, :created_at,
          :bio, :skills_json, :hourly_rate, :rating, :completed_projects, :earnings, :location, :profile_complete,
          :company, :industry, :verified_payment, :is_active
        )`,
        {
          id: f.id,
          email: f.email,
          google_id: null,
          password_hash: demoPasswordHash,
          name: f.name,
          phone: null,
          created_at: now,
          bio: f.bio,
          skills_json: f.skills_json,
          hourly_rate: f.hourly_rate,
          rating: f.rating,
          completed_projects: f.completed_projects,
          earnings: f.earnings,
          location: f.location,
          profile_complete: 90,
          company: "",
          industry: f.industry,
          verified_payment: 1,
          is_active: 1,
        },
      );
    }
  }

  const demoServices = [
    {
      id: "seed-service-1",
      freelancerEmail: "freelancer1@eliteethiopia.com",
      title: "Full-stack Web App Development",
      description:
        "Build complete web applications using Next.js, Node.js, and MySQL with clean architecture.",
      category: "Web Development",
      price_min: 2500,
      price_max: 12000,
      delivery_days: 10,
      tags_json: JSON.stringify(["Next.js", "Node.js", "MySQL"]),
    },
    {
      id: "seed-service-2",
      freelancerEmail: "freelancer2@eliteethiopia.com",
      title: "UI/UX Design for Web and Mobile",
      description:
        "Design modern, user-friendly interfaces, wireframes, and design systems in Figma.",
      category: "Design",
      price_min: 1800,
      price_max: 9000,
      delivery_days: 7,
      tags_json: JSON.stringify(["Figma", "UI Design", "Prototype"]),
    },
    {
      id: "seed-service-3",
      freelancerEmail: "freelancer3@eliteethiopia.com",
      title: "Performance Marketing and Google Ads",
      description:
        "Plan, launch, and optimize paid campaigns focused on conversions and measurable ROAS.",
      category: "Digital Marketing",
      price_min: 1200,
      price_max: 7000,
      delivery_days: 5,
      tags_json: JSON.stringify(["Google Ads", "SEO", "Analytics"]),
    },
  ] as const;

  const retiredDemoServiceIds = [
    "seed-service-4",
    "seed-service-5",
    "seed-service-6",
    "seed-service-7",
    "seed-service-8",
    "seed-service-9",
  ] as const;

  for (const s of demoServices) {
    const freelancerId = freelancerIdByEmail.get(s.freelancerEmail);
    if (!freelancerId) continue;
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM services WHERE id = :id LIMIT 1`,
      { id: s.id },
    );
    if (existing.length) continue;
    await pool.execute(
      `INSERT INTO services (
        id, freelancer_id, title, description, category, price_min, price_max, delivery_days, image_url, tags_json, status
      ) VALUES (
        :id, :freelancer_id, :title, :description, :category, :price_min, :price_max, :delivery_days, NULL, :tags_json, 'active'
      )`,
      {
        id: s.id,
        freelancer_id: freelancerId,
        title: s.title,
        description: s.description,
        category: s.category,
        price_min: s.price_min,
        price_max: s.price_max,
        delivery_days: s.delivery_days,
        tags_json: s.tags_json,
      },
    );
  }

  if (retiredDemoServiceIds.length) {
    await pool.execute(
      `UPDATE services SET status = 'inactive' WHERE id IN (${retiredDemoServiceIds.map((id) => `'${id}'`).join(", ")})`,
    );
  }

  const [clientRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE role = 'client' ORDER BY created_at ASC LIMIT 1`,
  );
  let clientId = clientRows[0]?.id as string | undefined;

  if (!clientId) {
    clientId = "seed-client-1";
    await pool.execute(
      `INSERT INTO users (
        id, email, google_id, password_hash, name, role, phone, verified, created_at,
        bio, skills_json, hourly_rate, rating, completed_projects, earnings, location, profile_complete,
        company, industry, verified_payment, is_active
      ) VALUES (
        :id, :email, :google_id, :password_hash, :name, 'client', :phone, 1, :created_at,
        :bio, :skills_json, 0, 0, 0, 0, :location, :profile_complete,
        :company, :industry, :verified_payment, :is_active
      )`,
      {
        id: clientId,
        email: "client1@eliteethiopia.com",
        google_id: null,
        password_hash: demoPasswordHash,
        name: "Demo Client",
        phone: null,
        created_at: now,
        bio: "Sample client account for local development.",
        skills_json: JSON.stringify([]),
        location: "Addis Ababa",
        profile_complete: 70,
        company: "Demo Trade PLC",
        industry: "Retail",
        verified_payment: 1,
        is_active: 1,
      },
    );
  }

  if (jobCount === 0) {
    const demoJobs = [
      {
        id: "seed-job-1",
        title: "Build company landing page with Next.js",
        description:
          "Need a responsive marketing website with contact form and SEO setup.",
        category: "Web Development",
        budget_type: "fixed",
        budget: 18000,
        hourly_rate: 0,
        job_type: "contract",
        duration: "2-3 weeks",
        skills_json: JSON.stringify(["Next.js", "Tailwind CSS", "SEO"]),
        experience_level: "mid",
      },
      {
        id: "seed-job-2",
        title: "Design mobile app onboarding screens",
        description:
          "Create modern onboarding flow and style guide for a fintech app.",
        category: "UI/UX Design",
        budget_type: "fixed",
        budget: 12000,
        hourly_rate: 0,
        job_type: "contract",
        duration: "1-2 weeks",
        skills_json: JSON.stringify(["Figma", "UX Writing", "Prototype"]),
        experience_level: "mid",
      },
      {
        id: "seed-job-3",
        title: "Run Google Ads for ecommerce store",
        description:
          "Set up and optimize search and display campaigns to improve ROAS.",
        category: "Digital Marketing",
        budget_type: "hourly",
        budget: 0,
        hourly_rate: 800,
        job_type: "part-time",
        duration: "1 month",
        skills_json: JSON.stringify([
          "Google Ads",
          "Analytics",
          "Conversion Tracking",
        ]),
        experience_level: "senior",
      },
    ] as const;

    for (const job of demoJobs) {
      await pool.execute(
        `INSERT INTO jobs (
          id, client_id, title, description, category, budget_type, budget, hourly_rate,
          job_type, deadline, duration, skills_json, visibility, freelancers_needed,
          experience_level, attachments_json, status, proposals_count, selected_freelancer_id, created_at, updated_at
        ) VALUES (
          :id, :client_id, :title, :description, :category, :budget_type, :budget, :hourly_rate,
          :job_type, :deadline, :duration, :skills_json, 'public', :freelancers_needed,
          :experience_level, :attachments_json, 'open', 0, NULL, :created_at, :updated_at
        )`,
        {
          id: job.id,
          client_id: clientId,
          title: job.title,
          description: job.description,
          category: job.category,
          budget_type: job.budget_type,
          budget: job.budget,
          hourly_rate: job.hourly_rate,
          job_type: job.job_type,
          deadline: null,
          duration: job.duration,
          skills_json: job.skills_json,
          freelancers_needed: 1,
          experience_level: job.experience_level,
          attachments_json: JSON.stringify([]),
          created_at: now,
          updated_at: now,
        },
      );
    }
  }
}

/**
 * Demo marketplace seed: additional freelancers (writing, video), demo clients,
 * demo sellers, and a small but realistic digital-product catalog. Idempotent —
 * every row is upserted by its stable `seed-*` id so re-running just refreshes
 * profile fields without creating duplicates.
 *
 * Also funds each demo user's Elite wallet with a small starter balance and
 * provisions a mock Telebirr account (PIN 1234, 5000 Br) so the full payment
 * flow works end-to-end after a single boot.
 */
async function seedMarketplaceDemo(pool: Pool): Promise<void> {
  const demoPasswordHash = await bcrypt.hash("SeedUser2026!", 10);
  const tbPinHash = await bcrypt.hash("1234", 8);
  const now = new Date();

  type DemoUser = {
    id: string;
    email: string;
    name: string;
    role: "client" | "freelancer" | "seller";
    phone: string;
    bio: string;
    short_bio?: string;
    skills_json: string;
    hourly_rate: number;
    rating: number;
    completed_projects: number;
    earnings: number;
    location: string;
    company: string;
    industry: string;
    profile_complete: number;
    verified_payment: number;
    profile_picture_url: string | null;
    starter_wallet: number;
    starter_coins: number;
    /** Mock Telebirr starting balance in Birr (separate from Elite wallet). */
    starter_telebirr: number;
  };

  const demoUsers: DemoUser[] = [
    // --- Additional freelancers (the existing 3 cover web dev, design, marketing) ---
    {
      id: "seed-freelancer-4",
      email: "freelancer4@eliteethiopia.com",
      name: "Mahlet A.",
      role: "freelancer",
      phone: "+251911000104",
      bio: "Bilingual copywriter and translator (Amharic ↔ English) for product, brand, and marketing teams.",
      short_bio: "Copywriting · Amharic translation",
      skills_json: JSON.stringify([
        "Copywriting",
        "Amharic Translation",
        "Brand Voice",
        "Editing",
      ]),
      hourly_rate: 12,
      rating: 4.85,
      completed_projects: 34,
      earnings: 56000,
      location: "Addis Ababa",
      company: "",
      industry: "Writing & Translation",
      profile_complete: 95,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
      starter_wallet: 1500,
      starter_coins: 60,
      starter_telebirr: 8000,
    },
    {
      id: "seed-freelancer-5",
      email: "freelancer5@eliteethiopia.com",
      name: "Yonas G.",
      role: "freelancer",
      phone: "+251911000105",
      bio: "Video editor and motion designer crafting product launch videos, social cuts, and explainers.",
      short_bio: "Video editing · Motion graphics",
      skills_json: JSON.stringify([
        "Premiere Pro",
        "After Effects",
        "Motion Graphics",
        "Color Grading",
      ]),
      hourly_rate: 22,
      rating: 4.9,
      completed_projects: 41,
      earnings: 78000,
      location: "Addis Ababa",
      company: "",
      industry: "Video & Animation",
      profile_complete: 92,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      starter_wallet: 2000,
      starter_coins: 80,
      starter_telebirr: 9000,
    },

    // --- Demo clients (upsert client1 from the original seed so it also gets a
    //     phone + Telebirr account, then two additional demo clients). ---
    {
      id: "seed-client-1",
      email: "client1@eliteethiopia.com",
      name: "Demo Client",
      role: "client",
      phone: "+251911000200",
      bio: "Sample client account for local development.",
      skills_json: JSON.stringify([]),
      hourly_rate: 0,
      rating: 0,
      completed_projects: 0,
      earnings: 0,
      location: "Addis Ababa",
      company: "Demo Trade PLC",
      industry: "Retail",
      profile_complete: 80,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      starter_wallet: 9000,
      starter_coins: 80,
      starter_telebirr: 12000,
    },
    {
      id: "seed-client-2",
      email: "client2@eliteethiopia.com",
      name: "Selamawit Bekele",
      role: "client",
      phone: "+251911000201",
      bio: "Operations lead at a logistics startup, hiring dev and design teams.",
      skills_json: JSON.stringify([]),
      hourly_rate: 0,
      rating: 0,
      completed_projects: 0,
      earnings: 0,
      location: "Addis Ababa",
      company: "Habesha Logistics PLC",
      industry: "Logistics",
      profile_complete: 85,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=400&h=400&fit=crop",
      starter_wallet: 12000,
      starter_coins: 120,
      starter_telebirr: 15000,
    },
    {
      id: "seed-client-3",
      email: "client3@eliteethiopia.com",
      name: "Robel Hailu",
      role: "client",
      phone: "+251911000202",
      bio: "Founder of a fintech startup looking for freelance design + marketing help.",
      skills_json: JSON.stringify([]),
      hourly_rate: 0,
      rating: 0,
      completed_projects: 0,
      earnings: 0,
      location: "Addis Ababa",
      company: "Birr Pay Technologies",
      industry: "Fintech",
      profile_complete: 90,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      starter_wallet: 18000,
      starter_coins: 200,
      starter_telebirr: 22000,
    },

    // --- Demo sellers ---
    {
      id: "seed-seller-1",
      email: "seller1@eliteethiopia.com",
      name: "Mihret Studio",
      role: "seller",
      phone: "+251911000301",
      bio: "Design studio publishing premium UI kits, Figma templates, and brand assets.",
      short_bio: "Premium UI kits & Figma templates",
      skills_json: JSON.stringify([]),
      hourly_rate: 0,
      rating: 4.9,
      completed_projects: 0,
      earnings: 42000,
      location: "Addis Ababa",
      company: "Mihret Design Studio",
      industry: "Design",
      profile_complete: 90,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=400&h=400&fit=crop",
      starter_wallet: 3500,
      starter_coins: 90,
      starter_telebirr: 7000,
    },
    {
      id: "seed-seller-2",
      email: "seller2@eliteethiopia.com",
      name: "Dawit K.",
      role: "seller",
      phone: "+251911000302",
      bio: "Independent course creator focusing on practical web and mobile development.",
      short_bio: "Courses on web & mobile dev",
      skills_json: JSON.stringify([]),
      hourly_rate: 0,
      rating: 4.85,
      completed_projects: 0,
      earnings: 31000,
      location: "Bahir Dar",
      company: "DK Academy",
      industry: "Education",
      profile_complete: 88,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
      starter_wallet: 2800,
      starter_coins: 70,
      starter_telebirr: 6000,
    },
    {
      id: "seed-seller-3",
      email: "seller3@eliteethiopia.com",
      name: "Bethel Audio Lab",
      role: "seller",
      phone: "+251911000303",
      bio: "Royalty-free music, sound effects, and voice-over assets for Ethiopian content creators.",
      short_bio: "Music · SFX · Voiceover packs",
      skills_json: JSON.stringify([]),
      hourly_rate: 0,
      rating: 4.7,
      completed_projects: 0,
      earnings: 18000,
      location: "Addis Ababa",
      company: "Bethel Audio Lab",
      industry: "Audio",
      profile_complete: 82,
      verified_payment: 1,
      profile_picture_url:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
      starter_wallet: 1800,
      starter_coins: 40,
      starter_telebirr: 5000,
    },
  ];

  const userIdByEmail = new Map<string, string>();

  for (const u of demoUsers) {
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE id = :id OR LOWER(email) = LOWER(:email) LIMIT 1`,
      { id: u.id, email: u.email },
    );
    const existingId = (existing[0]?.id as string | undefined) ?? null;

    if (existingId) {
      userIdByEmail.set(u.email.toLowerCase(), existingId);
      await pool.execute(
        `UPDATE users SET
           name = :name,
           role = :role,
           phone = :phone,
           verified = 1,
           is_active = 1,
           bio = :bio,
           short_bio = :short_bio,
           skills_json = :skills_json,
           hourly_rate = :hourly_rate,
           rating = :rating,
           completed_projects = :completed_projects,
           earnings = :earnings,
           location = :location,
           profile_complete = :profile_complete,
           company = :company,
           industry = :industry,
           verified_payment = :verified_payment,
           profile_picture_url = :profile_picture_url,
           coins = :coins
         WHERE id = :id`,
        {
          id: existingId,
          name: u.name,
          role: u.role,
          phone: u.phone,
          bio: u.bio,
          short_bio: u.short_bio ?? u.bio,
          skills_json: u.skills_json,
          hourly_rate: u.hourly_rate,
          rating: u.rating,
          completed_projects: u.completed_projects,
          earnings: u.earnings,
          location: u.location,
          profile_complete: u.profile_complete,
          company: u.company,
          industry: u.industry,
          verified_payment: u.verified_payment,
          profile_picture_url: u.profile_picture_url,
          coins: u.starter_coins,
        },
      );
    } else {
      userIdByEmail.set(u.email.toLowerCase(), u.id);
      await pool.execute(
        `INSERT INTO users (
          id, email, google_id, password_hash, name, role, phone, verified, created_at,
          bio, short_bio, skills_json, hourly_rate, rating, completed_projects, earnings, location, profile_complete,
          company, industry, verified_payment, is_active, profile_picture_url, coins
        ) VALUES (
          :id, :email, NULL, :password_hash, :name, :role, :phone, 1, :created_at,
          :bio, :short_bio, :skills_json, :hourly_rate, :rating, :completed_projects, :earnings, :location, :profile_complete,
          :company, :industry, :verified_payment, 1, :profile_picture_url, :coins
        )`,
        {
          id: u.id,
          email: u.email,
          password_hash: demoPasswordHash,
          name: u.name,
          role: u.role,
          phone: u.phone,
          created_at: now,
          bio: u.bio,
          short_bio: u.short_bio ?? u.bio,
          skills_json: u.skills_json,
          hourly_rate: u.hourly_rate,
          rating: u.rating,
          completed_projects: u.completed_projects,
          earnings: u.earnings,
          location: u.location,
          profile_complete: u.profile_complete,
          company: u.company,
          industry: u.industry,
          verified_payment: u.verified_payment,
          profile_picture_url: u.profile_picture_url,
          coins: u.starter_coins,
        },
      );
    }
  }

  // --- Wallets (Elite on-platform balance) ---
  for (const u of demoUsers) {
    const userId = userIdByEmail.get(u.email.toLowerCase());
    if (!userId) continue;
    const accountNo = `EE${String(Date.now()).slice(-6)}${Math.floor(
      Math.random() * 9000 + 1000,
    )}`;
    const walletId = `seed-wallet-${userId}`;
    await pool.execute(
      `INSERT IGNORE INTO wallets (id, user_id, account_no, balance)
       VALUES (:id, :user_id, :account_no, :balance)`,
      {
        id: walletId,
        user_id: userId,
        account_no: accountNo,
        balance: u.starter_wallet,
      },
    );
    await pool.execute(
      `UPDATE users SET wallet_account_no = COALESCE(wallet_account_no, :acc) WHERE id = :id`,
      { id: userId, acc: accountNo },
    );
  }

  // --- Mock Telebirr accounts (idempotent via INSERT IGNORE on PK = phone) ---
  if (await tableExists(pool, "telebirr_accounts")) {
    for (const u of demoUsers) {
      const userId = userIdByEmail.get(u.email.toLowerCase());
      if (!userId) continue;
      await pool.execute(
        `INSERT IGNORE INTO telebirr_accounts
           (phone_number, user_id, holder_name, balance, pin_hash, status)
         VALUES
           (:phone, :user_id, :holder, :balance, :pin_hash, 'active')`,
        {
          phone: u.phone,
          user_id: userId,
          holder: u.name,
          balance: u.starter_telebirr,
          pin_hash: tbPinHash,
        },
      );
      // Make sure the link to the Elite user is set (covers re-runs).
      await pool.execute(
        `UPDATE telebirr_accounts SET user_id = :user_id WHERE phone_number = :phone AND user_id IS NULL`,
        { phone: u.phone, user_id: userId },
      );
    }
  }

  // --- Digital products (linked to demo sellers) ---
  const sellerId1 = userIdByEmail.get("seller1@eliteethiopia.com");
  const sellerId2 = userIdByEmail.get("seller2@eliteethiopia.com");
  const sellerId3 = userIdByEmail.get("seller3@eliteethiopia.com");

  type DemoProduct = {
    id: string;
    creator_id: string | undefined;
    title: string;
    description: string;
    full_description: string;
    promotion_sample_url: string | null;
    category: string;
    price: number;
    image_url: string;
    images_json: string;
    file_path: string | null;
    downloads_count: number;
    rating: number;
    sales_count: number;
  };

  const demoProducts: DemoProduct[] = [
    {
      id: "seed-product-1",
      creator_id: sellerId1,
      title: "Elite Marketplace UI Kit (Figma)",
      description:
        "120+ polished components and 24 ready-made screens for marketplace and dashboard products.",
      full_description:
        "Complete Figma UI kit covering auth, onboarding, dashboards, listing pages, checkout, settings, and admin views. Built on auto-layout with light and dark themes and shared variables for typography, color, and spacing.",
      promotion_sample_url:
        "https://www.figma.com/community/file/1234567890",
      category: "Design Templates",
      price: 1500,
      image_url:
        "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800&h=600&fit=crop",
      images_json: JSON.stringify([
        "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&h=900&fit=crop",
        "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&h=900&fit=crop",
      ]),
      file_path: "https://example.com/downloads/elite-ui-kit.zip",
      downloads_count: 84,
      rating: 4.9,
      sales_count: 84,
    },
    {
      id: "seed-product-2",
      creator_id: sellerId1,
      title: "Brand Identity Pack — Ethiopian Cafe",
      description:
        "Logo system, color palette, typography, packaging templates, and social media kit for cafe brands.",
      full_description:
        "Editable Illustrator + Figma files: primary and secondary marks, mug, coffee bag, menu, business card, Instagram post templates, and a one-page brand guide PDF.",
      promotion_sample_url: null,
      category: "Design Templates",
      price: 950,
      image_url:
        "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&h=600&fit=crop",
      images_json: JSON.stringify([
        "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200&h=900&fit=crop",
      ]),
      file_path: "https://example.com/downloads/cafe-brand-pack.zip",
      downloads_count: 41,
      rating: 4.7,
      sales_count: 41,
    },
    {
      id: "seed-product-3",
      creator_id: sellerId2,
      title: "Full-Stack Next.js + MySQL Course",
      description:
        "12-hour course building a real marketplace app: auth, dashboards, payments, and deployment.",
      full_description:
        "Project-based course in Amharic and English. Modules cover Next.js App Router, server actions, MySQL schema design, JWT auth, file uploads, role-based dashboards, Stripe-style wallet flow, and production deploy on Vercel + PlanetScale.",
      promotion_sample_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      category: "Online Courses",
      price: 2200,
      image_url:
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop",
      images_json: JSON.stringify([
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=900&fit=crop",
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=900&fit=crop",
      ]),
      file_path: "https://example.com/downloads/nextjs-mysql-course.zip",
      downloads_count: 132,
      rating: 4.95,
      sales_count: 132,
    },
    {
      id: "seed-product-4",
      creator_id: sellerId2,
      title: "Mobile Dev with React Native — Starter Bundle",
      description:
        "Source code, video walkthroughs, and a 60-page guide to ship your first React Native app.",
      full_description:
        "Includes an expo starter project, navigation patterns, push notifications, offline storage with SQLite, and a chapter on publishing to Play Store and App Store from Ethiopia.",
      promotion_sample_url: null,
      category: "Online Courses",
      price: 1800,
      image_url:
        "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop",
      images_json: JSON.stringify([
        "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1200&h=900&fit=crop",
      ]),
      file_path: "https://example.com/downloads/react-native-starter.zip",
      downloads_count: 64,
      rating: 4.8,
      sales_count: 64,
    },
    {
      id: "seed-product-5",
      creator_id: sellerId3,
      title: "Royalty-Free Music Pack — Habesha Vibes",
      description:
        "20 instrumental tracks blending traditional Ethiopian instruments with modern production.",
      full_description:
        "High-quality WAV + MP3 stems and loops, cleared for commercial use on YouTube, podcasts, and ads. Includes BPM and key metadata for easy syncing.",
      promotion_sample_url: "https://soundcloud.com/example/sample-track",
      category: "Audio & Music",
      price: 700,
      image_url:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop",
      images_json: JSON.stringify([
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=900&fit=crop",
      ]),
      file_path: "https://example.com/downloads/habesha-vibes.zip",
      downloads_count: 28,
      rating: 4.6,
      sales_count: 28,
    },
    {
      id: "seed-product-6",
      creator_id: sellerId3,
      title: "Voice-Over Pack — Amharic & English Narration",
      description:
        "30 ready-to-use voice clips for product demos, ads, and explainer videos.",
      full_description:
        "Recorded in a treated studio, delivered as 48 kHz WAV. Includes both Amharic and English voiceovers covering common marketing phrases, onboarding lines, and call-to-action variations.",
      promotion_sample_url: null,
      category: "Audio & Music",
      price: 600,
      image_url:
        "https://images.unsplash.com/photo-1453738773917-9c3eff1db985?w=800&h=600&fit=crop",
      images_json: JSON.stringify([
        "https://images.unsplash.com/photo-1453738773917-9c3eff1db985?w=1200&h=900&fit=crop",
      ]),
      file_path: "https://example.com/downloads/voiceover-pack.zip",
      downloads_count: 19,
      rating: 4.7,
      sales_count: 19,
    },
  ];

  for (const p of demoProducts) {
    if (!p.creator_id) continue;
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM digital_products WHERE id = :id LIMIT 1`,
      { id: p.id },
    );
    if (existing.length) {
      await pool.execute(
        `UPDATE digital_products SET
           creator_id = :creator_id,
           title = :title,
           description = :description,
           full_description = :full_description,
           promotion_sample_url = :promotion_sample_url,
           category = :category,
           price = :price,
           image_url = :image_url,
           images_json = :images_json,
           file_path = :file_path,
           status = 'active'
         WHERE id = :id`,
        {
          id: p.id,
          creator_id: p.creator_id,
          title: p.title,
          description: p.description,
          full_description: p.full_description,
          promotion_sample_url: p.promotion_sample_url,
          category: p.category,
          price: p.price,
          image_url: p.image_url,
          images_json: p.images_json,
          file_path: p.file_path,
        },
      );
    } else {
      await pool.execute(
        `INSERT INTO digital_products (
          id, creator_id, title, description, full_description, promotion_sample_url,
          category, price, image_url, images_json, file_path, downloads_count, rating, sales_count, status
        ) VALUES (
          :id, :creator_id, :title, :description, :full_description, :promotion_sample_url,
          :category, :price, :image_url, :images_json, :file_path, :downloads_count, :rating, :sales_count, 'active'
        )`,
        {
          id: p.id,
          creator_id: p.creator_id,
          title: p.title,
          description: p.description,
          full_description: p.full_description,
          promotion_sample_url: p.promotion_sample_url,
          category: p.category,
          price: p.price,
          image_url: p.image_url,
          images_json: p.images_json,
          file_path: p.file_path,
          downloads_count: p.downloads_count,
          rating: p.rating,
          sales_count: p.sales_count,
        },
      );
    }
  }

  // ----------------------------------------------------------------------
  // Completed work + client reviews so freelancer profiles look real.
  // Each demo freelancer (the original 3 + the 2 new ones) gets one or two
  // completed service orders or jobs delivered for a demo client, with a
  // matching review row. Everything keyed by stable `seed-*` ids so re-runs
  // do not duplicate.
  // ----------------------------------------------------------------------
  const findUserId = async (email: string): Promise<string | null> => {
    const cached = userIdByEmail.get(email.toLowerCase());
    if (cached) return cached;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
      { email },
    );
    const id = (rows[0]?.id as string | undefined) ?? null;
    if (id) userIdByEmail.set(email.toLowerCase(), id);
    return id;
  };

  const findServiceIdByFreelancer = async (
    freelancerId: string,
  ): Promise<string | null> => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM services WHERE freelancer_id = :id AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
      { id: freelancerId },
    );
    return (rows[0]?.id as string | undefined) ?? null;
  };

  // Past digital product sales (real rows in `digital_purchases`, not only
  // `sales_count` on the product). One purchase per buyer per product so it
  // matches the app's duplicate-purchase rules.
  type DemoDigitalPurchase = {
    id: string;
    productId: string;
    buyerEmail: string;
    amount: number;
    daysAgo: number;
  };
  const demoDigitalPurchases: DemoDigitalPurchase[] = [
    { id: "seed-dp-001", productId: "seed-product-1", buyerEmail: "client1@eliteethiopia.com", amount: 1500, daysAgo: 45 },
    { id: "seed-dp-002", productId: "seed-product-1", buyerEmail: "client2@eliteethiopia.com", amount: 1500, daysAgo: 32 },
    { id: "seed-dp-003", productId: "seed-product-1", buyerEmail: "client3@eliteethiopia.com", amount: 1500, daysAgo: 11 },
    { id: "seed-dp-004", productId: "seed-product-2", buyerEmail: "client1@eliteethiopia.com", amount: 950, daysAgo: 60 },
    { id: "seed-dp-005", productId: "seed-product-2", buyerEmail: "client2@eliteethiopia.com", amount: 950, daysAgo: 22 },
    { id: "seed-dp-006", productId: "seed-product-3", buyerEmail: "client1@eliteethiopia.com", amount: 2200, daysAgo: 50 },
    { id: "seed-dp-007", productId: "seed-product-3", buyerEmail: "client2@eliteethiopia.com", amount: 2200, daysAgo: 27 },
    { id: "seed-dp-008", productId: "seed-product-3", buyerEmail: "client3@eliteethiopia.com", amount: 2200, daysAgo: 8 },
    { id: "seed-dp-009", productId: "seed-product-4", buyerEmail: "client1@eliteethiopia.com", amount: 1800, daysAgo: 19 },
    { id: "seed-dp-010", productId: "seed-product-4", buyerEmail: "client3@eliteethiopia.com", amount: 1800, daysAgo: 4 },
    { id: "seed-dp-011", productId: "seed-product-5", buyerEmail: "client2@eliteethiopia.com", amount: 700, daysAgo: 35 },
    { id: "seed-dp-012", productId: "seed-product-5", buyerEmail: "client3@eliteethiopia.com", amount: 700, daysAgo: 16 },
    { id: "seed-dp-013", productId: "seed-product-6", buyerEmail: "client1@eliteethiopia.com", amount: 600, daysAgo: 41 },
    { id: "seed-dp-014", productId: "seed-product-6", buyerEmail: "client2@eliteethiopia.com", amount: 600, daysAgo: 13 },
  ];
  if (await tableExists(pool, "digital_purchases")) {
    for (const dp of demoDigitalPurchases) {
      const buyerId = await findUserId(dp.buyerEmail);
      if (!buyerId) continue;
      const [prodRows] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM digital_products WHERE id = :id LIMIT 1`,
        { id: dp.productId },
      );
      if (!prodRows.length) continue;
      const createdAt = new Date(now.getTime() - dp.daysAgo * 24 * 60 * 60 * 1000);
      const [existingDp] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM digital_purchases WHERE id = :id LIMIT 1`,
        { id: dp.id },
      );
      if (existingDp.length) {
        await pool.execute(
          `UPDATE digital_purchases SET
             product_id = :product_id,
             buyer_id = :buyer_id,
             amount = :amount,
             payment_method = 'wallet',
             payment_status = 'completed'
           WHERE id = :id`,
          {
            id: dp.id,
            product_id: dp.productId,
            buyer_id: buyerId,
            amount: dp.amount,
          },
        );
      } else {
        await pool.execute(
          `INSERT INTO digital_purchases (
            id, product_id, buyer_id, amount, payment_method, payment_status, created_at
          ) VALUES (
            :id, :product_id, :buyer_id, :amount, 'wallet', 'completed', :created_at
          )`,
          {
            id: dp.id,
            product_id: dp.productId,
            buyer_id: buyerId,
            amount: dp.amount,
            created_at: createdAt,
          },
        );
      }
    }
    // Keep `sales_count` aligned with real `digital_purchases` rows for seed products.
    for (const pid of [
      "seed-product-1",
      "seed-product-2",
      "seed-product-3",
      "seed-product-4",
      "seed-product-5",
      "seed-product-6",
    ]) {
      const [cntRows] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM digital_purchases WHERE product_id = :pid`,
        { pid },
      );
      const c = Number((cntRows[0] as RowDataPacket)?.c ?? 0);
      await pool.execute(
        `UPDATE digital_products SET sales_count = :c WHERE id = :pid`,
        { c, pid },
      );
    }
  }

  type DemoCompletedOrder = {
    id: string;
    freelancerEmail: string;
    clientEmail: string;
    amount: number;
    notes: string;
    reviewId: string;
    rating: number;
    comment: string;
    daysAgo: number;
  };

  const demoCompletedOrders: DemoCompletedOrder[] = [
    {
      id: "seed-order-1",
      freelancerEmail: "freelancer1@eliteethiopia.com",
      clientEmail: "client2@eliteethiopia.com",
      amount: 8500,
      notes: "Delivery dashboard with auth and reporting screens.",
      reviewId: "seed-review-1",
      rating: 5,
      comment:
        "Beba shipped a clean, fast Next.js dashboard ahead of schedule. Communication was excellent and the code is well-organised. Will hire again.",
      daysAgo: 14,
    },
    {
      id: "seed-order-2",
      freelancerEmail: "freelancer1@eliteethiopia.com",
      clientEmail: "client3@eliteethiopia.com",
      amount: 4200,
      notes: "Marketing landing page with contact form and SEO.",
      reviewId: "seed-review-2",
      rating: 4.5,
      comment:
        "Great work on the landing page. Page speed is excellent and the Tailwind setup was easy to hand over to our team.",
      daysAgo: 28,
    },
    {
      id: "seed-order-3",
      freelancerEmail: "freelancer2@eliteethiopia.com",
      clientEmail: "client2@eliteethiopia.com",
      amount: 5200,
      notes: "Mobile app onboarding flow, 8 screens with prototype.",
      reviewId: "seed-review-3",
      rating: 5,
      comment:
        "Hana captured our brand voice in the first iteration. Figma file is impeccably organised and the prototype made stakeholder review effortless.",
      daysAgo: 9,
    },
    {
      id: "seed-order-4",
      freelancerEmail: "freelancer3@eliteethiopia.com",
      clientEmail: "client3@eliteethiopia.com",
      amount: 3800,
      notes: "Google Ads setup, two campaigns + conversion tracking.",
      reviewId: "seed-review-4",
      rating: 4.5,
      comment:
        "Samuel set up our Google Ads end-to-end and our CPL dropped within the first week. Clear reporting and responsive on chat.",
      daysAgo: 21,
    },
    {
      id: "seed-order-5",
      freelancerEmail: "freelancer4@eliteethiopia.com",
      clientEmail: "client2@eliteethiopia.com",
      amount: 2100,
      notes: "Amharic translation of marketing site and FAQ copy.",
      reviewId: "seed-review-5",
      rating: 5,
      comment:
        "Mahlet's Amharic copy reads naturally and stays on brand. Turnaround was very fast and feedback was incorporated the same day.",
      daysAgo: 6,
    },
    {
      id: "seed-order-6",
      freelancerEmail: "freelancer5@eliteethiopia.com",
      clientEmail: "client3@eliteethiopia.com",
      amount: 6400,
      notes: "Product launch video, 60s and 15s cuts with motion graphics.",
      reviewId: "seed-review-6",
      rating: 5,
      comment:
        "Yonas delivered a launch video that looks like it cost 10x what we paid. Color grading and motion graphics are top tier.",
      daysAgo: 12,
    },
  ];

  for (const o of demoCompletedOrders) {
    const freelancerId = await findUserId(o.freelancerEmail);
    const clientId = await findUserId(o.clientEmail);
    if (!freelancerId || !clientId) continue;
    const serviceId = await findServiceIdByFreelancer(freelancerId);
    if (!serviceId) continue; // freelancer4/5 do not have services yet — handled by demoCompletedJobs below

    const createdAt = new Date(now.getTime() - o.daysAgo * 24 * 60 * 60 * 1000);
    const [existingOrder] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM service_orders WHERE id = :id LIMIT 1`,
      { id: o.id },
    );
    if (existingOrder.length) {
      await pool.execute(
        `UPDATE service_orders SET
           service_id = :service_id,
           client_id = :client_id,
           freelancer_id = :freelancer_id,
           status = 'completed',
           total_amount = :total_amount,
           payment_method = 'wallet',
           payment_status = 'completed',
           notes = :notes
         WHERE id = :id`,
        {
          id: o.id,
          service_id: serviceId,
          client_id: clientId,
          freelancer_id: freelancerId,
          total_amount: o.amount,
          notes: o.notes,
        },
      );
    } else {
      await pool.execute(
        `INSERT INTO service_orders (
          id, service_id, client_id, freelancer_id, status, total_amount, payment_method, payment_status, notes, created_at, updated_at
        ) VALUES (
          :id, :service_id, :client_id, :freelancer_id, 'completed', :total_amount, 'wallet', 'completed', :notes, :created_at, :updated_at
        )`,
        {
          id: o.id,
          service_id: serviceId,
          client_id: clientId,
          freelancer_id: freelancerId,
          total_amount: o.amount,
          notes: o.notes,
          created_at: createdAt,
          updated_at: createdAt,
        },
      );
    }

    const [existingReview] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM reviews WHERE id = :id LIMIT 1`,
      { id: o.reviewId },
    );
    if (existingReview.length) {
      await pool.execute(
        `UPDATE reviews SET
           reviewer_id = :reviewer_id,
           target_user_id = :target_user_id,
           service_order_id = :service_order_id,
           job_id = NULL,
           rating = :rating,
           comment = :comment
         WHERE id = :id`,
        {
          id: o.reviewId,
          reviewer_id: clientId,
          target_user_id: freelancerId,
          service_order_id: o.id,
          rating: o.rating,
          comment: o.comment,
        },
      );
    } else {
      await pool.execute(
        `INSERT INTO reviews (
          id, reviewer_id, target_user_id, service_order_id, job_id, rating, comment, created_at
        ) VALUES (
          :id, :reviewer_id, :target_user_id, :service_order_id, NULL, :rating, :comment, :created_at
        )`,
        {
          id: o.reviewId,
          reviewer_id: clientId,
          target_user_id: freelancerId,
          service_order_id: o.id,
          rating: o.rating,
          comment: o.comment,
          created_at: createdAt,
        },
      );
    }
  }

  // Completed jobs (separate from service orders) so freelancer4 and freelancer5
  // also get a job-based review on their profile.
  type DemoCompletedJob = {
    id: string;
    freelancerEmail: string;
    clientEmail: string;
    title: string;
    description: string;
    category: string;
    skills: string[];
    budget: number;
    duration: string;
    daysAgo: number;
    reviewId: string;
    rating: number;
    comment: string;
  };

  const demoCompletedJobs: DemoCompletedJob[] = [
    {
      id: "seed-completed-job-1",
      freelancerEmail: "freelancer4@eliteethiopia.com",
      clientEmail: "client3@eliteethiopia.com",
      title: "Amharic translation of fintech onboarding emails",
      description:
        "Translate 12 transactional emails into natural, on-brand Amharic.",
      category: "Writing & Translation",
      skills: ["Amharic Translation", "Copy Editing"],
      budget: 4500,
      duration: "1 week",
      daysAgo: 30,
      reviewId: "seed-review-7",
      rating: 4.9,
      comment:
        "Mahlet translated our entire onboarding email sequence into Amharic without losing the tone. Customers actually replied saying the emails felt human.",
    },
    {
      id: "seed-completed-job-2",
      freelancerEmail: "freelancer5@eliteethiopia.com",
      clientEmail: "client2@eliteethiopia.com",
      title: "Edit 8-episode YouTube series on logistics tech",
      description:
        "Cut, color, and add motion graphics for an 8-part series shot in Addis.",
      category: "Video & Animation",
      skills: ["Premiere Pro", "After Effects", "Color Grading"],
      budget: 14000,
      duration: "3 weeks",
      daysAgo: 18,
      reviewId: "seed-review-8",
      rating: 5,
      comment:
        "Yonas turned hours of raw footage into a polished series. Hit every deadline and the motion graphics matched our brand perfectly.",
    },
    {
      id: "seed-completed-job-3",
      freelancerEmail: "freelancer2@eliteethiopia.com",
      clientEmail: "client3@eliteethiopia.com",
      title: "Design system audit and component library refresh",
      description:
        "Audit existing design system and rebuild the component library in Figma with tokens.",
      category: "UI/UX Design",
      skills: ["Figma", "Design Systems"],
      budget: 9500,
      duration: "2 weeks",
      daysAgo: 40,
      reviewId: "seed-review-9",
      rating: 4.8,
      comment:
        "Hana delivered a token-driven library that our devs can map straight to Tailwind. Excellent documentation alongside the file.",
    },
  ];

  for (const j of demoCompletedJobs) {
    const freelancerId = await findUserId(j.freelancerEmail);
    const clientId = await findUserId(j.clientEmail);
    if (!freelancerId || !clientId) continue;

    const createdAt = new Date(now.getTime() - j.daysAgo * 24 * 60 * 60 * 1000);
    const [existingJob] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM jobs WHERE id = :id LIMIT 1`,
      { id: j.id },
    );
    if (existingJob.length) {
      await pool.execute(
        `UPDATE jobs SET
           client_id = :client_id,
           title = :title,
           description = :description,
           category = :category,
           budget_type = 'fixed',
           budget = :budget,
           hourly_rate = 0,
           job_type = 'contract',
           duration = :duration,
           skills_json = :skills_json,
           visibility = 'public',
           freelancers_needed = 1,
           experience_level = 'mid',
           attachments_json = '[]',
           status = 'completed',
           selected_freelancer_id = :selected_freelancer_id
         WHERE id = :id`,
        {
          id: j.id,
          client_id: clientId,
          title: j.title,
          description: j.description,
          category: j.category,
          budget: j.budget,
          duration: j.duration,
          skills_json: JSON.stringify(j.skills),
          selected_freelancer_id: freelancerId,
        },
      );
    } else {
      await pool.execute(
        `INSERT INTO jobs (
          id, client_id, title, description, category, budget_type, budget, hourly_rate,
          job_type, deadline, duration, skills_json, visibility, freelancers_needed,
          experience_level, attachments_json, status, proposals_count, selected_freelancer_id, created_at, updated_at
        ) VALUES (
          :id, :client_id, :title, :description, :category, 'fixed', :budget, 0,
          'contract', NULL, :duration, :skills_json, 'public', 1,
          'mid', '[]', 'completed', 1, :selected_freelancer_id, :created_at, :updated_at
        )`,
        {
          id: j.id,
          client_id: clientId,
          title: j.title,
          description: j.description,
          category: j.category,
          budget: j.budget,
          duration: j.duration,
          skills_json: JSON.stringify(j.skills),
          selected_freelancer_id: freelancerId,
          created_at: createdAt,
          updated_at: createdAt,
        },
      );
    }

    const [existingReview] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM reviews WHERE id = :id LIMIT 1`,
      { id: j.reviewId },
    );
    if (existingReview.length) {
      await pool.execute(
        `UPDATE reviews SET
           reviewer_id = :reviewer_id,
           target_user_id = :target_user_id,
           service_order_id = NULL,
           job_id = :job_id,
           rating = :rating,
           comment = :comment
         WHERE id = :id`,
        {
          id: j.reviewId,
          reviewer_id: clientId,
          target_user_id: freelancerId,
          job_id: j.id,
          rating: j.rating,
          comment: j.comment,
        },
      );
    } else {
      await pool.execute(
        `INSERT INTO reviews (
          id, reviewer_id, target_user_id, service_order_id, job_id, rating, comment, created_at
        ) VALUES (
          :id, :reviewer_id, :target_user_id, NULL, :job_id, :rating, :comment, :created_at
        )`,
        {
          id: j.reviewId,
          reviewer_id: clientId,
          target_user_id: freelancerId,
          job_id: j.id,
          rating: j.rating,
          comment: j.comment,
          created_at: createdAt,
        },
      );
    }
  }

  // Refresh aggregate rating + completed_projects for the freelancers we touched
  // so the public profile cards reflect the seeded reviews.
  const touchedFreelancerEmails = Array.from(
    new Set([
      ...demoCompletedOrders.map((o) => o.freelancerEmail),
      ...demoCompletedJobs.map((j) => j.freelancerEmail),
    ]),
  );
  for (const email of touchedFreelancerEmails) {
    const freelancerId = await findUserId(email);
    if (!freelancerId) continue;
    await pool.execute(
      `UPDATE users u
         SET
           rating = COALESCE((
             SELECT ROUND(AVG(rating), 2) FROM reviews WHERE target_user_id = u.id
           ), u.rating),
           completed_projects = (
             SELECT COUNT(*) FROM service_orders WHERE freelancer_id = u.id AND status = 'completed'
           ) + (
             SELECT COUNT(*) FROM jobs WHERE selected_freelancer_id = u.id AND status = 'completed'
           )
       WHERE u.id = :id`,
      { id: freelancerId },
    );
  }
}

/** Older project seeds used these emails for split admin rows. */
const LEGACY_ADMIN_EMAILS = [
  "superadmin@eliteethiopia.com",
  "founder@eliteethiopia.com",
];

/**
 * Consolidates any legacy admin rows into a single merged admin account at
 * `env.seed.founderEmail` (default: `admin@eliteethiopia.com`) with role
 * `super-admin`. Idempotent.
 *
 * Behaviour:
 *  - If the merged email already exists, ensures role=`super-admin` and active.
 *    Any legacy admin rows pointing to other emails are demoted to `client` so
 *    only one admin login remains.
 *  - Otherwise, picks the first legacy row and renames it to the merged email,
 *    promoting to `super-admin`. Other legacy rows are demoted.
 */
async function migrateLegacyAdminsToSingle(pool: Pool): Promise<void> {
  const adminEmail = env.seed.founderEmail.toLowerCase();

  const [primary] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE LOWER(email) = LOWER(:e) LIMIT 1`,
    { e: adminEmail },
  );

  if (primary.length) {
    // Make sure the canonical row is super-admin and active.
    await pool.execute(
      `UPDATE users
         SET role = 'super-admin', is_active = 1, name = 'Administrator'
       WHERE LOWER(email) = LOWER(:e)`,
      { e: adminEmail },
    );
  } else {
    // Promote the first legacy row to the merged admin email.
    let promoted = false;
    for (const legacy of LEGACY_ADMIN_EMAILS) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER(:e) LIMIT 1`,
        { e: legacy },
      );
      if (!rows.length) continue;
      const password_hash = await bcrypt.hash(env.seed.founderPassword, 10);
      await pool.execute(
        `UPDATE users
           SET email = :email,
               password_hash = :password_hash,
               name = 'Administrator',
               role = 'super-admin',
               is_active = 1
         WHERE LOWER(email) = LOWER(:legacy)`,
        { email: adminEmail, password_hash, legacy },
      );
      // eslint-disable-next-line no-console
      console.log(`[auth] Migrated legacy admin ${legacy} → ${adminEmail}`);
      promoted = true;
      break;
    }
    if (!promoted) {
      // Fall back: promote the only super-admin row (any email) to the merged email.
      const [supers] = await pool.query<RowDataPacket[]>(
        `SELECT id, email FROM users WHERE role = 'super-admin' LIMIT 1`,
      );
      if (supers.length) {
        const password_hash = await bcrypt.hash(env.seed.founderPassword, 10);
        await pool.execute(
          `UPDATE users
             SET email = :email,
                 password_hash = :password_hash,
                 name = 'Administrator',
                 role = 'super-admin',
                 is_active = 1
           WHERE id = :id`,
          { email: adminEmail, password_hash, id: String(supers[0]!.id) },
        );
        // eslint-disable-next-line no-console
        console.log(
          `[auth] Renamed existing super-admin ${String(supers[0]!.email)} → ${adminEmail}`,
        );
      }
    }
  }

  // Demote any other lingering admin/super-admin rows so only the merged email is privileged.
  await pool.execute(
    `UPDATE users
       SET role = 'client'
     WHERE role IN ('admin', 'super-admin') AND LOWER(email) <> LOWER(:e)`,
    { e: adminEmail },
  );
}

async function syncSeedAdminPasswordsFromEnv(pool: Pool): Promise<void> {
  const email = env.seed.founderEmail.toLowerCase();
  const password_hash = await bcrypt.hash(env.seed.founderPassword, 10);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET password_hash = :password_hash WHERE LOWER(email) = :email`,
    { password_hash, email },
  );
  if (result.affectedRows > 0) {
    // eslint-disable-next-line no-console
    console.log(`[seed] Updated password hash for ${email}`);
  } else if (env.syncSeedAdminPasswords) {
    // eslint-disable-next-line no-console
    console.warn(
      `[seed] Admin password sync: no row matched ${email} (migration may be needed).`,
    );
  }
}

export async function initDatabase(pool: Pool): Promise<void> {
  // Disable foreign key checks during initial schema creation so tables
  // with interdependent foreign keys can be created in any order.
  await pool.query('SET FOREIGN_KEY_CHECKS=0')
  for (const stmt of SCHEMA_STATEMENTS) {
    await pool.query(stmt)
  }
  await pool.query('SET FOREIGN_KEY_CHECKS=1')
  if (!(await tableExists(pool, "users"))) {
    throw new Error("Schema initialization failed: users table missing");
  }
  await ensureUsersIsActiveColumn(pool);
  await ensureUsersMarketplaceColumns(pool);
  await ensureUsersOnboardingProfileColumns(pool);
  await ensureDigitalProductsDeliveryColumns(pool);
  await ensureMessagesAttachmentColumns(pool);
  await ensureReviewsJobIdColumn(pool);
  if (await tableExists(pool, "delivery_requests")) {
    await pool.query("DROP TABLE delivery_requests");
  }
  await pool.query(`UPDATE users SET role = 'client' WHERE role = 'rider'`);
  // Seeding can use SQL constructs (CAST AS JSON) that may not be supported
  // on all local MySQL/MariaDB versions. Allow skipping seeding in that case
  // by setting `SKIP_DB_SEED=1` in backend/.env.
  if (String(process.env.SKIP_DB_SEED || '').toLowerCase() !== '1') {
    await seedIfEmpty(pool);
    await seedFreelancersAndJobs(pool);
    await seedMarketplaceDemo(pool);
    await seedFullDemo(pool);
  } else {
    // eslint-disable-next-line no-console
    console.log('[init-db] SKIP_DB_SEED=1 set — skipping demo data seeding')
  }
  await migrateLegacyAdminsToSingle(pool);
  if (env.syncSeedAdminPasswords) {
    await syncSeedAdminPasswordsFromEnv(pool);
  }
}
