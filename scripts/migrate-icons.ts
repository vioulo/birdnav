import { prisma } from "@/lib/prisma";
import { discoverSiteIconUrl } from "@/lib/site-icon";

function isLocalIconPath(value: string | null) {
  return !!value && value.startsWith("/uploads/icons/");
}

async function main() {
  const sites = await prisma.site.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      url: true,
      iconUrl: true,
    },
  });

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const site of sites) {
    if (isLocalIconPath(site.iconUrl)) {
      skippedCount += 1;
      continue;
    }

    try {
      const localIconUrl = await discoverSiteIconUrl(site.url);

      if (!localIconUrl) {
        failedCount += 1;
        console.info(`[skip] ${site.id} ${site.name} -> no local icon resolved`);
        continue;
      }

      await prisma.site.update({
        where: { id: site.id },
        data: {
          iconUrl: localIconUrl,
        },
      });

      migratedCount += 1;
      console.info(`[ok] ${site.id} ${site.name} -> ${localIconUrl}`);
    } catch (error) {
      failedCount += 1;
      console.error(`[fail] ${site.id} ${site.name}`, error);
    }
  }

  console.info("");
  console.info(`Done. migrated=${migratedCount} skipped=${skippedCount} failed=${failedCount}`);
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
