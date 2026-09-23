import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Idempotent seed for a fresh production database.
 * Seeds the single-tenant default user and the four demo brand voice
 * profiles exactly as configured in the running application.
 * Safe to run repeatedly — upserts, never duplicates.
 *
 * Run with: npm run db:seed   (or: npx prisma db seed)
 */
const DEFAULT_EMAIL = "owner@contentforge.local";

const DEMO_BRANDS: Array<{
  name: string;
  description: string | null;
  industry: string | null;
  targetAudience: string | null;
  personality: string | null;
  tone: string | null;
  values: string[];
  preferredPhrases: string[];
  avoidedPhrases: string[];
  writingStyle: string | null;
  exampleContent: string | null;
}> = [
  {
    "name": "Acme Coffee",
    "tone": "casual",
    "values": [
      "sustainability"
    ],
    "industry": "Specialty coffee",
    "description": null,
    "personality": null,
    "writingStyle": null,
    "avoidedPhrases": [
      "game-changer"
    ],
    "exampleContent": null,
    "targetAudience": null,
    "preferredPhrases": [
      "brewed with intention"
    ]
  },
  {
    "name": "Pulse Athletics",
    "tone": "motivational, confident. Minimal emoji.",
    "values": [
      "Consistency over perfection",
      "Sustainable progress",
      "Discipline",
      "Personal growth",
      "Evidence-based fitness"
    ],
    "industry": "Fitness & Wellness",
    "description": "A modern performance and fitness brand helping everyday athletes build strength, consistency, and sustainable training habits.",
    "personality": "Energetic, disciplined, motivating, direct",
    "writingStyle": "Short, energetic sentences. Strong opening hooks. Practical advice. Clear, short, action-oriented calls to action. Avoid exaggerated fitness promises.",
    "avoidedPhrases": [
      "Get shredded instantly",
      "Miracle transformation",
      "No pain, no gain",
      "Guaranteed results",
      "Extreme fitness claims"
    ],
    "exampleContent": "Your strongest workout is not always your hardest one. It is the one you consistently come back for.\n\nProgress does not need to be dramatic. Add one rep. Improve one habit. Show up again tomorrow.",
    "targetAudience": "Fitness enthusiasts, gym-goers, amateur athletes, and health-conscious professionals aged 20-40.",
    "preferredPhrases": [
      "Keep showing up",
      "Progress compounds",
      "Build stronger",
      "Train with purpose",
      "Small wins",
      "Consistency"
    ]
  },
  {
    "name": "Northstar Finance",
    "tone": "educational, professional. No emoji.",
    "values": [
      "Financial clarity",
      "Transparency",
      "Responsible decision-making",
      "Simplicity",
      "Long-term thinking"
    ],
    "industry": "FinTech / Personal Finance",
    "description": "A personal-finance technology company helping young professionals understand spending, saving, and long-term financial decisions.",
    "personality": "Clear, trustworthy, intelligent, calm",
    "writingStyle": "Explain financial concepts in plain language. Prefer useful explanations over hype. Use short examples when appropriate. Never make unrealistic financial promises. Educational, low-pressure calls to action.",
    "avoidedPhrases": [
      "Get rich",
      "Guaranteed returns",
      "Secret investment",
      "Easy money",
      "Become a millionaire overnight"
    ],
    "exampleContent": "A budget is not about restricting every purchase. It is about knowing where your money is going before you decide where it should go.\n\nBefore asking which investment could make the most money, understand how much risk you can actually afford.",
    "targetAudience": "Young professionals, freelancers, and first-time investors aged 22-40.",
    "preferredPhrases": [
      "Financial clarity",
      "Understand your money",
      "Long-term",
      "Make informed decisions",
      "Build better habits",
      "Your financial picture"
    ]
  },
  {
    "name": "Roamly",
    "tone": "conversational, inspirational. Occasional, context-appropriate emoji.",
    "values": [
      "Curiosity",
      "Authentic experiences",
      "Local culture",
      "Responsible travel",
      "Discovery"
    ],
    "industry": "Travel & Lifestyle",
    "description": "A digital travel brand helping curious travelers discover memorable places, local experiences, and smarter ways to explore.",
    "personality": "Curious, warm, adventurous, human",
    "writingStyle": "Story-led and sensory without becoming overly poetic. Write like an experienced traveler giving a thoughtful recommendation to a friend. Inviting rather than aggressively promotional calls to action.",
    "avoidedPhrases": [
      "Ultimate paradise",
      "Best place ever",
      "Once-in-a-lifetime",
      "Instagrammable",
      "Bucket-list destination"
    ],
    "exampleContent": "Skip the busiest street for an afternoon. The cafe two blocks away might end up being the part of the city you remember.\n\nSome places are better when you stop trying to see everything.",
    "targetAudience": "Young professionals, digital nomads, couples, and independent travelers aged 20-38.",
    "preferredPhrases": [
      "Worth the detour",
      "Explore differently",
      "Local favorite",
      "Slow down",
      "Hidden corner",
      "Discover"
    ]
  }
];

async function main() {
  // 1. Default (single-tenant) user — matches src/lib/prisma.ts
  const owner = await prisma.user.upsert({
    where: { email: DEFAULT_EMAIL },
    update: {},
    create: { email: DEFAULT_EMAIL, name: "ContentForge Owner" },
  });

  // 2. Demo brand voice profiles — verbatim from the app configuration
  for (const brand of DEMO_BRANDS) {
    const existing = await prisma.brand.findFirst({
      where: { name: brand.name, userId: owner.id },
    });
    if (existing) {
      await prisma.brand.update({ where: { id: existing.id }, data: brand });
    } else {
      await prisma.brand.create({ data: { ...brand, userId: owner.id } });
    }
  }

  const [users, brands] = await Promise.all([prisma.user.count(), prisma.brand.count()]);
  console.log(`Seed complete: ${users} user(s), ${brands} brand(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
