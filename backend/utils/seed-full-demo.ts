/**
 * Large idempotent demo dataset: many clients, freelancers, sellers, products
 * (with image galleries + promotion video/audio URLs), services, open jobs,
 * proposals, hire invitations, active/completed/cancelled contracts, deliveries,
 * service orders, purchases, and reviews. Stable `seed2-*` ids so re-runs refresh
 * without duplicating rows.
 *
 * Password for all synthetic users: SeedUser2026! (same as other demo seeds).
 */
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

const DEMO_PASSWORD = "SeedUser2026!";

const UNSPLASH = (photoId: string, w = 800, h = 600) =>
  `https://images.unsplash.com/${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

const AVATAR = (n: number) =>
  `https://i.pravatar.cc/400?img=${(n % 70) + 1}`;

/** Short public sample videos for product promotion / previews */
const PROMO_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.youtube.com/watch?v=LXb3EKWsInQ",
  "https://www.youtube.com/watch?v=ScMzIvxBSi4",
] as const;

const SKILL_POOL = [
  ["React", "Next.js", "TypeScript"],
  ["Figma", "UI Design", "Prototyping"],
  ["Node.js", "Express", "MySQL"],
  ["Python", "Django", "REST APIs"],
  ["Google Ads", "Meta Ads", "Analytics"],
  ["Copywriting", "SEO", "Content Strategy"],
  ["Premiere Pro", "DaVinci Resolve", "Motion"],
  ["Flutter", "Dart", "Firebase"],
  ["AWS", "Docker", "CI/CD"],
  ["Blender", "3D Modeling", "Rendering"],
] as const;

const PRODUCT_CATEGORIES = [
  "Design Templates",
  "Online Courses",
  "Audio & Music",
  "Code & Scripts",
  "Business Kits",
  "Photography",
] as const;

const JOB_CATEGORIES = [
  "Web Development",
  "UI/UX Design",
  "Digital Marketing",
  "Writing & Translation",
  "Video & Animation",
  "Mobile Development",
] as const;

/** Realistic display names for seeded freelancer accounts (not “Freelancer 1”). */
const FREELANCER_DISPLAY_NAMES = [
  "Aster Alemayehu",
  "Birtukan Tesfaye",
  "Dawit Mekonnen",
  "Eden Haile",
  "Fikir Lemma",
  "Girma Bekele",
  "Hirut Assefa",
  "Jember Tadesse",
  "Kidan Solomon",
  "Lemma Desta",
  "Mekdes Worku",
  "Nahom Girma",
  "Rediet Tsegaye",
  "Sisay Demeke",
  "Tigist Alemu",
  "Wondimu Hailemariam",
  "Yared Teshome",
  "Zelalem Negash",
  "Betelhem Fikadu",
  "Chaltu Abye",
] as const;

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :n LIMIT 1`,
    { n: name },
  );
  return Array.isArray(rows) && (rows as { TABLE_NAME: string }[]).length > 0;
}

type SeedRole = "client" | "freelancer" | "seller";

type SeedUserSpec = {
  id: string;
  email: string;
  name: string;
  role: SeedRole;
  phone: string;
  bio: string;
  shortBio?: string;
  skills: string[];
  hourlyRate: number;
  rating: number;
  completedProjects: number;
  earnings: number;
  location: string;
  company: string;
  industry: string;
  profileComplete: number;
  profilePictureUrl: string | null;
  wallet: number;
  coins: number;
  telebirr: number;
};

function buildFreelancerSpecs(count: number): SeedUserSpec[] {
  const cities = ["Addis Ababa", "Dire Dawa", "Hawassa", "Bahir Dar", "Mekelle"];
  const out: SeedUserSpec[] = [];
  for (let i = 1; i <= count; i++) {
    const id = `seed2-f-${String(i).padStart(3, "0")}`;
    const displayName =
      FREELANCER_DISPLAY_NAMES[(i - 1) % FREELANCER_DISPLAY_NAMES.length]!;
    const first = displayName.split(/\s+/)[0] ?? displayName;
    out.push({
      id,
      email: `seed2.fl${String(i).padStart(3, "0")}@eliteethiopia.com`,
      name: displayName,
      role: "freelancer",
      phone: `+2519201${String(10000 + i).slice(-6)}`,
      bio: `${first} delivers focused, high-quality work across ${SKILL_POOL[i % SKILL_POOL.length].slice(0, 2).join(" and ")} — clear communication, on-time handovers, and portfolio-ready results.`,
      shortBio: `${SKILL_POOL[i % SKILL_POOL.length].slice(0, 2).join(" · ")}`,
      skills: [...SKILL_POOL[i % SKILL_POOL.length]],
      hourlyRate: 12 + (i % 28),
      rating: 4.2 + (i % 8) / 10,
      completedProjects: 5 + (i % 40),
      earnings: 15000 + i * 4200,
      location: cities[i % cities.length]!,
      company: "",
      industry: ["Software", "Design", "Marketing", "Media"][i % 4]!,
      profileComplete: 88 + (i % 10),
      profilePictureUrl: AVATAR(i + 3),
      wallet: 2000 + (i % 15) * 500,
      coins: 40 + (i % 120),
      telebirr: 5000 + (i % 20) * 800,
    });
  }
  return out;
}

function buildClientSpecs(count: number): SeedUserSpec[] {
  const out: SeedUserSpec[] = [];
  for (let i = 1; i <= count; i++) {
    const id = `seed2-c-${String(i).padStart(3, "0")}`;
    out.push({
      id,
      email: `seed2.cl${String(i).padStart(3, "0")}@eliteethiopia.com`,
      name: `Demo Client Org ${i}`,
      role: "client",
      phone: `+2519202${String(10000 + i).slice(-6)}`,
      bio: `Hiring manager ${i} for product, growth, and creative needs on Elite Ethiopia.`,
      skills: [],
      hourlyRate: 0,
      rating: 0,
      completedProjects: 0,
      earnings: 0,
      location: "Addis Ababa",
      company: `SeedCo ${i} PLC`,
      industry: ["Retail", "Logistics", "Fintech", "Hospitality", "Agri"][i % 5]!,
      profileComplete: 75 + (i % 20),
      profilePictureUrl: AVATAR(i + 40),
      wallet: 6000 + i * 900,
      coins: 50 + (i % 200),
      telebirr: 8000 + i * 1100,
    });
  }
  return out;
}

function buildSellerSpecs(count: number): SeedUserSpec[] {
  const out: SeedUserSpec[] = [];
  for (let i = 1; i <= count; i++) {
    const id = `seed2-s-${String(i).padStart(3, "0")}`;
    out.push({
      id,
      email: `seed2.sl${String(i).padStart(3, "0")}@eliteethiopia.com`,
      name: `Demo Seller Studio ${i}`,
      role: "seller",
      phone: `+2519203${String(10000 + i).slice(-6)}`,
      bio: `Digital goods publisher ${i}: templates, courses, and media packs for Ethiopian creators.`,
      shortBio: "Templates · courses · assets",
      skills: [],
      hourlyRate: 0,
      rating: 4.5 + (i % 5) / 10,
      completedProjects: 0,
      earnings: 12000 + i * 3000,
      location: "Addis Ababa",
      company: `Studio ${i} Digital`,
      industry: "Creative",
      profileComplete: 86 + (i % 8),
      profilePictureUrl: AVATAR(i + 10),
      wallet: 2500 + (i % 12) * 400,
      coins: 60 + (i % 90),
      telebirr: 4500 + (i % 8) * 600,
    });
  }
  return out;
}

async function upsertSeedUser(
  pool: Pool,
  passwordHash: string,
  u: SeedUserSpec,
  now: Date,
): Promise<void> {
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE id = :id OR LOWER(email) = LOWER(:email) LIMIT 1`,
    { id: u.id, email: u.email },
  );
  const skillsJson = JSON.stringify(u.skills);
  const shortBio = u.shortBio ?? u.bio;

  if (existing.length) {
    const id = String(existing[0]!.id);
    await pool.execute(
      `UPDATE users SET
         password_hash = :password_hash,
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
         verified_payment = 1,
         profile_picture_url = :profile_picture_url,
         coins = :coins
       WHERE id = :id`,
      {
        id,
        password_hash: passwordHash,
        name: u.name,
        role: u.role,
        phone: u.phone,
        bio: u.bio,
        short_bio: shortBio,
        skills_json: skillsJson,
        hourly_rate: u.hourlyRate,
        rating: u.rating,
        completed_projects: u.completedProjects,
        earnings: u.earnings,
        location: u.location,
        profile_complete: u.profileComplete,
        company: u.company,
        industry: u.industry,
        profile_picture_url: u.profilePictureUrl,
        coins: u.coins,
      },
    );
  } else {
    await pool.execute(
      `INSERT INTO users (
        id, email, google_id, password_hash, name, role, phone, verified, created_at,
        bio, short_bio, skills_json, hourly_rate, rating, completed_projects, earnings, location, profile_complete,
        company, industry, verified_payment, is_active, profile_picture_url, coins
      ) VALUES (
        :id, :email, NULL, :password_hash, :name, :role, :phone, 1, :created_at,
        :bio, :short_bio, :skills_json, :hourly_rate, :rating, :completed_projects, :earnings, :location, :profile_complete,
        :company, :industry, 1, 1, :profile_picture_url, :coins
      )`,
      {
        id: u.id,
        email: u.email,
        password_hash: passwordHash,
        name: u.name,
        role: u.role,
        phone: u.phone,
        created_at: now,
        bio: u.bio,
        short_bio: shortBio,
        skills_json: skillsJson,
        hourly_rate: u.hourlyRate,
        rating: u.rating,
        completed_projects: u.completedProjects,
        earnings: u.earnings,
        location: u.location,
        profile_complete: u.profileComplete,
        company: u.company,
        industry: u.industry,
        profile_picture_url: u.profilePictureUrl,
        coins: u.coins,
      },
    );
  }
}

async function ensureWalletAndTelebirr(
  pool: Pool,
  userId: string,
  u: SeedUserSpec,
  tbPinHash: string,
): Promise<void> {
  const accountNo = `EE2${userId.replace(/[^a-z0-9]/gi, "").slice(0, 20).toUpperCase()}`.slice(
    0,
    32,
  );
  const walletId = `seed2-wlt-${userId}`;
  await pool.execute(
    `INSERT IGNORE INTO wallets (id, user_id, account_no, balance)
     VALUES (:id, :user_id, :account_no, :balance)`,
    {
      id: walletId,
      user_id: userId,
      account_no: accountNo,
      balance: u.wallet,
    },
  );
  await pool.execute(
    `UPDATE users SET wallet_account_no = COALESCE(wallet_account_no, :acc) WHERE id = :id`,
    { id: userId, acc: accountNo },
  );

  if (await tableExists(pool, "telebirr_accounts")) {
    await pool.execute(
      `INSERT IGNORE INTO telebirr_accounts
         (phone_number, user_id, holder_name, balance, pin_hash, status)
       VALUES (:phone, :user_id, :holder, :balance, :pin_hash, 'active')`,
      {
        phone: u.phone,
        user_id: userId,
        holder: u.name,
        balance: u.telebirr,
        pin_hash: tbPinHash,
      },
    );
    await pool.execute(
      `UPDATE telebirr_accounts SET user_id = :user_id WHERE phone_number = :phone AND user_id IS NULL`,
      { phone: u.phone, user_id: userId },
    );
  }
}

async function resolveUserId(pool: Pool, spec: SeedUserSpec): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE id = :id OR LOWER(email) = LOWER(:email) LIMIT 1`,
    { id: spec.id, email: spec.email },
  );
  return String(rows[0]?.id ?? spec.id);
}

export async function seedFullDemo(pool: Pool): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const tbPinHash = await bcrypt.hash("1234", 8);
  const now = new Date();

  const freelancers = buildFreelancerSpecs(20);
  const clients = buildClientSpecs(12);
  const sellers = buildSellerSpecs(8);
  const allSpecs = [...freelancers, ...clients, ...sellers];

  for (const u of allSpecs) {
    await upsertSeedUser(pool, passwordHash, u, now);
  }

  const freelancerIds: string[] = [];
  const clientIds: string[] = [];
  const sellerIds: string[] = [];

  for (const u of freelancers) {
    const id = await resolveUserId(pool, u);
    freelancerIds.push(id);
    await ensureWalletAndTelebirr(pool, id, u, tbPinHash);
  }
  for (const u of clients) {
    const id = await resolveUserId(pool, u);
    clientIds.push(id);
    await ensureWalletAndTelebirr(pool, id, u, tbPinHash);
  }
  for (const u of sellers) {
    const id = await resolveUserId(pool, u);
    sellerIds.push(id);
    await ensureWalletAndTelebirr(pool, id, u, tbPinHash);
  }

  const coverIds = [
    "photo-1498050108023-c5249f4df085",
    "photo-1517694712202-14dd9538aa97",
    "photo-1559028012-481c04fa702d",
    "photo-1551650975-87deedd944c3",
    "photo-1460925895917-afdab827c52f",
    "photo-1504639725592-7335d3aa449f",
    "photo-1526374965328-7f61d4dc18c5",
    "photo-1516321318423-f06f85e504b3",
  ];

  // --- Services (2 per bulk freelancer) ---
  let svcIdx = 0;
  for (let fi = 0; fi < freelancerIds.length; fi++) {
    const fid = freelancerIds[fi]!;
    for (let k = 0; k < 2; k++) {
      svcIdx += 1;
      const sid = `seed2-g-${String(svcIdx).padStart(4, "0")}`;
      const cat = JOB_CATEGORIES[svcIdx % JOB_CATEGORIES.length]!;
      const img = UNSPLASH(coverIds[svcIdx % coverIds.length]!);
      await pool.execute(
        `INSERT INTO services (
          id, freelancer_id, title, description, category, price_min, price_max, delivery_days, image_url, tags_json, status
        ) VALUES (
          :id, :fid, :title, :desc, :cat, :pmin, :pmax, :days, :img, :tags, 'active'
        )
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          category = VALUES(category),
          price_min = VALUES(price_min),
          price_max = VALUES(price_max),
          delivery_days = VALUES(delivery_days),
          image_url = VALUES(image_url),
          tags_json = VALUES(tags_json),
          status = 'active'`,
        {
          id: sid,
          fid,
          title: `${cat} package #${svcIdx} (seed)`,
          desc: `Turn-key delivery for ${cat.toLowerCase()} work. Includes revisions, handover notes, and async support during the engagement.`,
          cat,
          pmin: 1500 + (svcIdx % 8) * 400,
          pmax: 9000 + (svcIdx % 12) * 800,
          days: 5 + (svcIdx % 10),
          img,
          tags: JSON.stringify(SKILL_POOL[svcIdx % SKILL_POOL.length]),
        },
      );
    }
  }

  // --- Digital products (4 per bulk seller): galleries + rotating promo videos ---
  const photoIds = coverIds;
  let prodIdx = 0;
  for (let si = 0; si < sellerIds.length; si++) {
    const creator = sellerIds[si]!;
    for (let k = 0; k < 4; k++) {
      prodIdx += 1;
      const pid = `seed2-p-${String(prodIdx).padStart(4, "0")}`;
      const cat = PRODUCT_CATEGORIES[prodIdx % PRODUCT_CATEGORIES.length]!;
      const price = 400 + (prodIdx % 25) * 150;
      const mainImg = UNSPLASH(photoIds[(prodIdx + 1) % photoIds.length]!);
      const gallery = JSON.stringify([
        UNSPLASH(photoIds[prodIdx % photoIds.length]!, 1200, 900),
        UNSPLASH(photoIds[(prodIdx + 2) % photoIds.length]!, 1200, 900),
      ]);
      const promo =
        prodIdx % 3 === 0 ? PROMO_VIDEOS[prodIdx % PROMO_VIDEOS.length]! : null;
      await pool.execute(
        `INSERT INTO digital_products (
          id, creator_id, title, description, full_description, promotion_sample_url,
          category, price, image_url, images_json, file_path, downloads_count, rating, sales_count, status
        ) VALUES (
          :id, :creator, :title, :desc, :fdesc, :promo,
          :cat, :price, :img, :gallery, :file, :dl, :rating, 0, 'active'
        )
        ON DUPLICATE KEY UPDATE
          creator_id = VALUES(creator_id),
          title = VALUES(title),
          description = VALUES(description),
          full_description = VALUES(full_description),
          promotion_sample_url = VALUES(promotion_sample_url),
          category = VALUES(category),
          price = VALUES(price),
          image_url = VALUES(image_url),
          images_json = VALUES(images_json),
          file_path = VALUES(file_path),
          downloads_count = VALUES(downloads_count),
          rating = VALUES(rating),
          status = 'active'`,
        {
          id: pid,
          creator,
          title: `${cat} asset bundle ${prodIdx}`,
          desc: `High-quality ${cat.toLowerCase()} pack for teams and creators. Instant download after purchase.`,
          fdesc: `Includes layered sources, documentation, and a short walkthrough. Optimised for Elite Ethiopia marketplace preview and checkout flows.`,
          promo,
          cat,
          price,
          img: mainImg,
          gallery,
          file: `https://example.com/downloads/seed2-${pid}.zip`,
          dl: 10 + (prodIdx % 200),
          rating: 4.3 + (prodIdx % 7) / 10,
        },
      );
    }
  }

  // --- Digital purchases (each product: 2–3 buyers from pool; stable purchase ids) ---
  if (await tableExists(pool, "digital_purchases")) {
    let dpi = 0;
    const productCount = sellerIds.length * 4;
    for (let p = 1; p <= productCount; p++) {
      const pid = `seed2-p-${String(p).padStart(4, "0")}`;
      const buyers = [
        clientIds[(p + 0) % clientIds.length]!,
        clientIds[(p + 3) % clientIds.length]!,
        clientIds[(p + 6) % clientIds.length]!,
      ].filter((v, i, a) => a.indexOf(v) === i);
      for (const buyerId of buyers) {
        dpi += 1;
        const purchaseId = `seed2-dp-${String(dpi).padStart(5, "0")}`;
        const [pr] = await pool.query<RowDataPacket[]>(
          `SELECT price FROM digital_products WHERE id = :id LIMIT 1`,
          { id: pid },
        );
        if (!pr.length) continue;
        const amount = Number(pr[0]!.price ?? 0);
        const daysAgo = 1 + (dpi % 90);
        const createdAt = new Date(now.getTime() - daysAgo * 86400000);
        await pool.execute(
          `INSERT INTO digital_purchases (
            id, product_id, buyer_id, amount, payment_method, payment_status, created_at
          ) VALUES (
            :id, :pid, :buyer, :amount, 'wallet', 'completed', :created_at
          )
          ON DUPLICATE KEY UPDATE
            product_id = VALUES(product_id),
            buyer_id = VALUES(buyer_id),
            amount = VALUES(amount),
            payment_method = 'wallet',
            payment_status = 'completed'`,
          {
            id: purchaseId,
            pid,
            buyer: buyerId,
            amount,
            created_at: createdAt,
          },
        );
      }
    }
    for (let p = 1; p <= productCount; p++) {
      const pid = `seed2-p-${String(p).padStart(4, "0")}`;
      const [cntRows] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM digital_purchases WHERE product_id = :pid`,
        { pid },
      );
      const c = Number((cntRows[0] as RowDataPacket)?.c ?? 0);
      await pool.execute(`UPDATE digital_products SET sales_count = :c WHERE id = :pid`, {
        c,
        pid,
      });
    }
  }

  // --- Open jobs + proposals ---
  const openJobCount = 24;
  for (let j = 1; j <= openJobCount; j++) {
    const jid = `seed2-j-open-${String(j).padStart(3, "0")}`;
    const clientId = clientIds[j % clientIds.length]!;
    const cat = JOB_CATEGORIES[j % JOB_CATEGORIES.length]!;
    const skills = SKILL_POOL[j % SKILL_POOL.length];
    const attachments = JSON.stringify([
      { name: "project-brief.pdf", size: 240_000 },
      { name: `moodboard-${j}.png`, size: 890_000 },
    ]);
    await pool.execute(
      `INSERT INTO jobs (
        id, client_id, title, description, category, budget_type, budget, hourly_rate,
        job_type, deadline, duration, skills_json, visibility, freelancers_needed,
        experience_level, attachments_json, status, proposals_count, selected_freelancer_id, created_at, updated_at
      ) VALUES (
        :id, :cid, :title, :desc, :cat, :btype, :budget, :hrate,
        :jtype, :deadline, :dur, :skills, 'public', 1,
        :exp, :att, 'open', :pc, NULL, :ca, :ua
      )
      ON DUPLICATE KEY UPDATE
        client_id = VALUES(client_id),
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        budget_type = VALUES(budget_type),
        budget = VALUES(budget),
        hourly_rate = VALUES(hourly_rate),
        job_type = VALUES(job_type),
        deadline = VALUES(deadline),
        duration = VALUES(duration),
        skills_json = VALUES(skills_json),
        attachments_json = VALUES(attachments_json),
        status = 'open',
        selected_freelancer_id = NULL,
        proposals_count = VALUES(proposals_count),
        updated_at = VALUES(updated_at)`,
      {
        id: jid,
        cid: clientId,
        title: `${cat} — open role #${j} (seed2)`,
        desc: `We are expanding our digital presence and need help with ${cat.toLowerCase()}. Expect weekly async check-ins and clear acceptance criteria.`,
        cat,
        btype: j % 4 === 0 ? "hourly" : "fixed",
        budget: j % 4 === 0 ? 0 : 8000 + j * 600,
        hrate: j % 4 === 0 ? 450 + (j % 5) * 40 : 0,
        jtype: j % 3 === 0 ? "part-time" : "contract",
        deadline: null,
        dur: `${1 + (j % 4)}–${2 + (j % 4)} weeks`,
        skills: JSON.stringify(skills),
        exp: ["junior", "mid", "senior"][j % 3],
        att: attachments,
        pc: 3,
        ca: new Date(now.getTime() - (j % 14) * 86400000),
        ua: now,
      },
    );

    let proposalCount = 0;
    for (let t = 0; t < 3; t++) {
      const fid = freelancerIds[(j + t) % freelancerIds.length]!;
      const propId = `seed2-pr-${jid}-${t}`;
      proposalCount += 1;
      await pool.execute(
        `INSERT INTO job_proposals (id, job_id, freelancer_id, bid_amount, cover_letter, cv_file_name, status)
         VALUES (:id, :jid, :fid, :bid, :letter, NULL, 'pending')
         ON DUPLICATE KEY UPDATE
           bid_amount = VALUES(bid_amount),
           cover_letter = VALUES(cover_letter),
           status = 'pending'`,
        {
          id: propId,
          jid,
          fid,
          bid: 5000 + j * 200 + t * 350,
          letter: `Hi — I am freelancer seed2 match ${t + 1} for job ${j}. I have shipped similar ${cat} work and can start this week.`,
        },
      );
    }
    await pool.execute(`UPDATE jobs SET proposals_count = :n WHERE id = :id`, {
      n: proposalCount,
      id: jid,
    });
  }

  // --- Active contracts (in progress) ---
  const activeCount = 10;
  for (let j = 1; j <= activeCount; j++) {
    const jid = `seed2-j-ip-${String(j).padStart(3, "0")}`;
    const clientId = clientIds[(j + 2) % clientIds.length]!;
    const fid = freelancerIds[(j * 2) % freelancerIds.length]!;
    const cat = JOB_CATEGORIES[(j + 1) % JOB_CATEGORIES.length]!;
    await pool.execute(
      `INSERT INTO jobs (
        id, client_id, title, description, category, budget_type, budget, hourly_rate,
        job_type, deadline, duration, skills_json, visibility, freelancers_needed,
        experience_level, attachments_json, status, proposals_count, selected_freelancer_id, created_at, updated_at
      ) VALUES (
        :id, :cid, :title, :desc, :cat, 'fixed', :budget, 0,
        'contract', :deadline, :dur, :skills, 'public', 1,
        'mid', '[]', 'in_progress', 1, :fid, :ca, :ua
      )
      ON DUPLICATE KEY UPDATE
        client_id = VALUES(client_id),
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        budget = VALUES(budget),
        deadline = VALUES(deadline),
        duration = VALUES(duration),
        skills_json = VALUES(skills_json),
        status = 'in_progress',
        selected_freelancer_id = VALUES(selected_freelancer_id),
        updated_at = VALUES(updated_at)`,
      {
        id: jid,
        cid: clientId,
        title: `Live contract — ${cat} sprint #${j}`,
        desc: `Ongoing engagement (seed2). Deliverables tracked under Elite contracts with milestone reviews.`,
        cat,
        budget: 12000 + j * 900,
        deadline: new Date(now.getTime() + (10 + j) * 86400000)
          .toISOString()
          .slice(0, 10),
        dur: "2 weeks",
        skills: JSON.stringify(SKILL_POOL[j % SKILL_POOL.length]),
        fid,
        ca: new Date(now.getTime() - (3 + j) * 86400000),
        ua: now,
      },
    );
    const acceptedPid = `seed2-pr-acc-${jid}`;
    await pool.execute(
      `INSERT INTO job_proposals (id, job_id, freelancer_id, bid_amount, cover_letter, cv_file_name, status)
       VALUES (:id, :jid, :fid, :bid, :letter, NULL, 'accepted')
       ON DUPLICATE KEY UPDATE status = 'accepted', freelancer_id = VALUES(freelancer_id)`,
      {
        id: acceptedPid,
        jid,
        fid,
        bid: 11000 + j * 500,
        letter: "Accepted proposal for seeded active contract.",
      },
    );

    if (j % 2 === 0) {
      const delId = `seed2-del-ip-${j}`;
      await pool.execute(
        `INSERT INTO contract_deliveries (id, job_id, freelancer_id, summary, link_url, status, client_feedback, created_at, reviewed_at)
         VALUES (:id, :jid, :fid, :sum, :url, 'submitted', NULL, :ca, NULL)
         ON DUPLICATE KEY UPDATE
           summary = VALUES(summary),
           link_url = VALUES(link_url),
           status = VALUES(status)`,
        {
          id: delId,
          jid,
          fid,
          sum: "Milestone 1 delivery: implemented core screens and shared preview build.",
          url: "https://example.com/seed2-delivery-preview",
          ca: new Date(now.getTime() - 86400000),
        },
      );
    }
  }

  // --- Completed contracts (historical jobs) ---
  const doneCount = 16;
  for (let j = 1; j <= doneCount; j++) {
    const jid = `seed2-j-done-${String(j).padStart(3, "0")}`;
    const clientId = clientIds[(j + 4) % clientIds.length]!;
    const fid = freelancerIds[(j + 5) % freelancerIds.length]!;
    const cat = JOB_CATEGORIES[(j + 2) % JOB_CATEGORIES.length]!;
    const createdAt = new Date(now.getTime() - (20 + j) * 86400000);
    await pool.execute(
      `INSERT INTO jobs (
        id, client_id, title, description, category, budget_type, budget, hourly_rate,
        job_type, deadline, duration, skills_json, visibility, freelancers_needed,
        experience_level, attachments_json, status, proposals_count, selected_freelancer_id, created_at, updated_at
      ) VALUES (
        :id, :cid, :title, :desc, :cat, 'fixed', :budget, 0,
        'contract', NULL, :dur, :skills, 'public', 1,
        'mid', '[]', 'completed', 1, :fid, :ca, :ua
      )
      ON DUPLICATE KEY UPDATE
        client_id = VALUES(client_id),
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        budget = VALUES(budget),
        duration = VALUES(duration),
        skills_json = VALUES(skills_json),
        status = 'completed',
        selected_freelancer_id = VALUES(selected_freelancer_id),
        updated_at = VALUES(updated_at)`,
      {
        id: jid,
        cid: clientId,
        title: `Completed — ${cat} engagement #${j}`,
        desc: `Closed contract (seed2). Work was reviewed and released via Elite Ethiopia.`,
        cat,
        budget: 9500 + j * 700,
        dur: "3 weeks",
        skills: JSON.stringify(SKILL_POOL[(j + 3) % SKILL_POOL.length]),
        fid,
        ca: createdAt,
        ua: createdAt,
      },
    );
    if (j % 2 === 1) {
      const delId = `seed2-del-done-${j}`;
      await pool.execute(
        `INSERT INTO contract_deliveries (id, job_id, freelancer_id, summary, link_url, status, client_feedback, created_at, reviewed_at)
         VALUES (:id, :jid, :fid, :sum, :url, 'approved', 'Looks great — approved.', :ca, :ra)
         ON DUPLICATE KEY UPDATE
           summary = VALUES(summary),
           status = VALUES(status),
           client_feedback = VALUES(client_feedback),
           reviewed_at = VALUES(reviewed_at)`,
        {
          id: delId,
          jid,
          fid,
          sum: "Final delivery package with source files and Loom walkthrough.",
          url: "https://example.com/seed2-final-handoff",
          ca: createdAt,
          ra: new Date(createdAt.getTime() + 86400000 * 2),
        },
      );
    }
    const revId = `seed2-rev-job-${j}`;
    await pool.execute(
      `INSERT INTO reviews (id, reviewer_id, target_user_id, service_order_id, job_id, rating, comment, created_at)
       VALUES (:id, :rev, :target, NULL, :jid, :rating, :comment, :ca)
       ON DUPLICATE KEY UPDATE
         rating = VALUES(rating),
         comment = VALUES(comment),
         job_id = VALUES(job_id)`,
      {
        id: revId,
        rev: clientId,
        target: fid,
        jid,
        rating: 4 + (j % 6) / 10,
        comment: `Strong delivery on ${cat}. Would hire again for similar scope.`,
        ca: createdAt,
      },
    );
  }

  // --- Cancelled / ended contracts ---
  const cancelledCount = 6;
  for (let j = 1; j <= cancelledCount; j++) {
    const jid = `seed2-j-can-${String(j).padStart(3, "0")}`;
    const clientId = clientIds[(j + 7) % clientIds.length]!;
    const fid = freelancerIds[(j + 9) % freelancerIds.length]!;
    const cat = JOB_CATEGORIES[(j + 4) % JOB_CATEGORIES.length]!;
    const createdAt = new Date(now.getTime() - (40 + j) * 86400000);
    await pool.execute(
      `INSERT INTO jobs (
        id, client_id, title, description, category, budget_type, budget, hourly_rate,
        job_type, deadline, duration, skills_json, visibility, freelancers_needed,
        experience_level, attachments_json, status, proposals_count, selected_freelancer_id, created_at, updated_at
      ) VALUES (
        :id, :cid, :title, :desc, :cat, 'fixed', :budget, 0,
        'contract', NULL, :dur, :skills, 'public', 1,
        'mid', '[]', 'cancelled', 1, :fid, :ca, :ua
      )
      ON DUPLICATE KEY UPDATE
        client_id = VALUES(client_id),
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        budget = VALUES(budget),
        duration = VALUES(duration),
        skills_json = VALUES(skills_json),
        status = 'cancelled',
        selected_freelancer_id = VALUES(selected_freelancer_id),
        updated_at = VALUES(updated_at)`,
      {
        id: jid,
        cid: clientId,
        title: `Cancelled — ${cat} pilot #${j}`,
        desc: `Ended contract (seed2): priorities changed; engagement closed on platform.`,
        cat,
        budget: 6000 + j * 400,
        dur: "1 week",
        skills: JSON.stringify(SKILL_POOL[(j + 1) % SKILL_POOL.length]),
        fid,
        ca: createdAt,
        ua: createdAt,
      },
    );
  }

  // --- Hire invitations (mix of statuses) ---
  const hiStatuses = ["pending", "accepted", "declined", "cancelled"] as const;
  for (let i = 1; i <= 20; i++) {
    const hid = `seed2-hi-${String(i).padStart(3, "0")}`;
    const clientId = clientIds[i % clientIds.length]!;
    const fid = freelancerIds[(i + 3) % freelancerIds.length]!;
    const st = hiStatuses[i % hiStatuses.length]!;
    const responded =
      st === "pending" ? null : new Date(now.getTime() - (i % 10) * 86400000);
    const [svcRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, title FROM services WHERE freelancer_id = :fid AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
      { fid },
    );
    const serviceId = (svcRows[0]?.id as string | undefined) ?? null;
    await pool.execute(
      `INSERT INTO hire_invitations (
        id, client_id, freelancer_id, service_id, job_id, title, message, proposed_amount, status, created_at, responded_at
      ) VALUES (
        :id, :cid, :fid, :sid, NULL, :title, :msg, :amt, :st, :ca, :ra
      )
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        message = VALUES(message),
        proposed_amount = VALUES(proposed_amount),
        status = VALUES(status),
        responded_at = VALUES(responded_at)`,
      {
        id: hid,
        cid: clientId,
        fid,
        sid: serviceId,
        title: `Invitation: ${serviceId ? "service engagement" : "direct hire"} #${i}`,
        msg: `We would like to work with you on a scoped package. Budget suggested below; happy to align on timeline.`,
        amt: 4000 + i * 350,
        st,
        ca: new Date(now.getTime() - (i % 20) * 86400000),
        ra: responded,
      },
    );
  }

  // --- Completed service orders (marketplace gigs) ---
  let orderIdx = 0;
  for (let i = 0; i < freelancerIds.length; i++) {
    const fid = freelancerIds[i]!;
    const [svcRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM services WHERE freelancer_id = :fid AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
      { fid },
    );
    const serviceId = svcRows[0]?.id as string | undefined;
    if (!serviceId) continue;
    for (let k = 0; k < 2; k++) {
      orderIdx += 1;
      const oid = `seed2-so-${String(orderIdx).padStart(4, "0")}`;
      const clientId = clientIds[(i + k + 1) % clientIds.length]!;
      const amount = 3200 + (orderIdx % 20) * 450;
      const createdAt = new Date(now.getTime() - (orderIdx % 45) * 86400000);
      await pool.execute(
        `INSERT INTO service_orders (
          id, service_id, client_id, freelancer_id, status, total_amount, payment_method, payment_status, notes, created_at, updated_at
        ) VALUES (
          :id, :sid, :cid, :fid, 'completed', :amt, 'wallet', 'completed', :notes, :ca, :ua
        )
        ON DUPLICATE KEY UPDATE
          service_id = VALUES(service_id),
          client_id = VALUES(client_id),
          freelancer_id = VALUES(freelancer_id),
          status = 'completed',
          total_amount = VALUES(total_amount),
          notes = VALUES(notes),
          updated_at = VALUES(updated_at)`,
        {
          id: oid,
          sid: serviceId,
          cid: clientId,
          fid,
          amt: amount,
          notes: `Seed2 completed order ${orderIdx}: async delivery with shared Figma / repo links.`,
          ca: createdAt,
          ua: createdAt,
        },
      );
      const rid = `seed2-rev-so-${orderIdx}`;
      await pool.execute(
        `INSERT INTO reviews (id, reviewer_id, target_user_id, service_order_id, job_id, rating, comment, created_at)
         VALUES (:id, :rev, :target, :soid, NULL, :rating, :comment, :ca)
         ON DUPLICATE KEY UPDATE
           rating = VALUES(rating),
           comment = VALUES(comment),
           service_order_id = VALUES(service_order_id)`,
        {
          id: rid,
          rev: clientId,
          target: fid,
          soid: oid,
          rating: 4.2 + (orderIdx % 8) / 10,
          comment: "Great collaboration — clear updates and solid handover.",
          ca: createdAt,
        },
      );
    }
  }

  // --- Refresh freelancer aggregates touched by seed2 reviews & orders ---
  const [flEmails] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE email LIKE 'seed2.fl%@eliteethiopia.com'`,
  );
  for (const row of flEmails) {
    const uid = String(row.id);
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
      { id: uid },
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed2] Full demo dataset applied: ${freelancers.length} freelancers, ${clients.length} clients, ${sellers.length} sellers (+ services, products, jobs, contracts, purchases).`,
  );
}
