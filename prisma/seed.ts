import { randomBytes, scryptSync } from "node:crypto";

import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const defaultOptions = {
  "site.title": "BIRDNAV",
  "site.subtitle": "Curated links for focused browsing.",
  "site.description": "A sharp-edged navigation site for curated links and focused browsing.",
  "site.keywords": "navigation, links, bookmarks, BirdNav",
  "site.url": "",
  "site.og_image": "",
  "ui.radius": "0",
  "site.click_behavior": "detail",
  "footer.copyright": "© 2026 BirdNav. All rights reserved.",
  "footer.links": "OpenAI|https://openai.com\nGitHub|https://github.com",
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const existingAdmin = await prisma.user.findUnique({
    where: { username },
  });
  const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");

  await prisma.user.upsert({
    where: { username },
    update: {
      role: UserRole.ADMIN,
    },
    create: {
      username,
      passwordHash: hashPassword(password),
      role: UserRole.ADMIN,
    },
  });

  if (!existingAdmin) {
    console.info(`Created admin user "${username}".`);

    if (process.env.ADMIN_PASSWORD) {
      console.info("Admin password was loaded from ADMIN_PASSWORD.");
    } else {
      console.info(`Generated admin password: ${password}`);
    }
  }

  const categories = [
    { name: "Default", slug: "default", color: "#5b8cff", sortOrder: 1 },
    { name: "Development", slug: "development", color: "#17a673", sortOrder: 2 },
    { name: "Design", slug: "design", color: "#c86b1f", sortOrder: 3 },
    { name: "论坛", slug: "bbs", color: "#c86b5f", sortOrder: 4 },
    { name: "个人博客", slug: "blogs", color: "#4c3fe1", sortOrder: 5 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const [optKey, optValue] of Object.entries(defaultOptions)) {
    await prisma.option.upsert({
      where: { optKey },
      update: { optValue },
      create: { optKey, optValue },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
