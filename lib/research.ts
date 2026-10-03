import { prisma } from "@/lib/prisma";

export type TriggerCategory =
  | "INWESTYCJE"
  | "MASZYNY"
  | "EKSPANSJA"
  | "REKRUTACJE"
  | "LOKALIZACJE"
  | "NEWS"
  | "LINKEDIN";

export interface ResearchTrigger {
  category: TriggerCategory;
  title: string;
  snippet: string;
  source: string;
  sourceUrl?: string;
  publishedAt?: Date;
  hookSuggestion: string;
  confidence: number;
}

/**
 * Clean formal corporate suffixes for precise web and news searching
 * e.g. "LIDL SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ SPÓŁKA KOMANDYTOWA" -> "Lidl"
 */
export function cleanCompanyName(name: string): string {
  let cleaned = name
    .replace(/\bSPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ\b/gi, "")
    .replace(/\bSPÓŁKA AKCYJNA\b/gi, "")
    .replace(/\bSPÓŁKA KOMANDYTOWO-AKCYJNA\b/gi, "")
    .replace(/\bSPÓŁKA KOMANDYTOWA\b/gi, "")
    .replace(/\bSPÓŁKA JAWNA\b/gi, "")
    .replace(/\bSP\.?\s*Z\s*O\.?\s*O\.?\b/gi, "")
    .replace(/\bS\.?\s*A\.?\b/gi, "")
    .replace(/\bSP\.?\s*K\.?\b/gi, "")
    .replace(/\bSP\.?\s*J\.?\b/gi, "")
    .replace(/\bS\.?\s*K\.?\s*A\.?\b/gi, "")
    .replace(/\bPOLSKA\b/gi, "Polska")
    .replace(/\s+/g, " ")
    .trim();

  // If cleaning resulted in very short or empty string, fallback to original
  if (cleaned.length < 3) return name;

  // Title case the cleaned name
  return cleaned
    .split(" ")
    .map((word) =>
      word.length > 2
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toUpperCase()
    )
    .join(" ");
}

/**
 * Fetch and parse Google News RSS articles for Poland matching company and keywords
 */
async function fetchGoogleNewsTriggers(
  companyName: string,
  city?: string | null,
  monthsBack = 12
): Promise<ResearchTrigger[]> {
  const cleanName = cleanCompanyName(companyName);
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

  const triggers: ResearchTrigger[] = [];

  // Keyword query buckets targeting the requested trigger types
  const queries: {
    category: TriggerCategory;
    keywords: string;
    hookTemplate: (title: string, snippet: string) => string;
  }[] = [
    {
      category: "INWESTYCJE",
      keywords: `"${cleanName}" (inwestycja OR inwestycje OR "nowy zakład" OR budowa OR modernizacja OR dofinansowanie)`,
      hookTemplate: (title) =>
        `Zauważyłem ostatnie doniesienia o Waszych inwestycjach („${title.slice(0, 75)}...”). W jaki sposób zabezpieczacie skalowalność tego projektu?`,
    },
    {
      category: "MASZYNY",
      keywords: `"${cleanName}" (maszyny OR "park maszynowy" OR automatyzacja OR robotyzacja OR "nowa linia" OR technologia)`,
      hookTemplate: (title) =>
        `Widziałem wzmiankę o rozwoju Waszego parku maszynowego i automatyzacji. Jak przebiega wdrożenie i jakie cele operacyjne przed nim stawiacie?`,
    },
    {
      category: "EKSPANSJA",
      keywords: `"${cleanName}" (ekspansja OR "nowe rynki" OR eksport OR przejęcie OR akwizycja OR wzrost)`,
      hookTemplate: (title) =>
        `Gratuluję dynamicznej ekspansji rynkowej! W obliczu takiego wzrostu, jak radzicie sobie ze sprawnym pozyskiwaniem i obsługą nowych partnerów?`,
    },
    {
      category: "REKRUTACJE",
      keywords: `"${cleanName}" (rekrutacja OR "zatrudnienie" OR "nowe miejsca pracy" OR "zespół powiększa" OR pracownicy)`,
      hookTemplate: (title) =>
        `Zauważyłem, że mocno powiększacie zespół. Przy tak intensywnej rekrutacji, czy optymalizacja procesów i narzędzi jest dla Was teraz priorytetem?`,
    },
    {
      category: "LOKALIZACJE",
      keywords: `"${cleanName}" ("nowy oddział" OR "nowa siedziba" OR "nowe biuro" OR magazyn OR centrum OR hala)`,
      hookTemplate: (title) =>
        `Gratuluję otwarcia nowej lokalizacji. Przy uruchamianiu nowego obiektu kluczowa bywa sprawna koordynacja — jak oceniacie pierwsze rezultaty?`,
    },
    {
      category: "NEWS",
      keywords: `"${cleanName}" (nagroda OR wyróżnienie OR wyniki OR kontrakt OR porozumienie OR sukces)`,
      hookTemplate: (title) =>
        `Trafiłem na informację o Waszym sukcesie: „${title.slice(0, 80)}”. Gratulacje! W związku z tym chciałem zapytać o dalsze plany...`,
    },
  ];

  // Run news queries in parallel with 4s timeout
  await Promise.allSettled(
    queries.map(async (q) => {
      try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
          q.keywords
        )}&hl=pl&gl=PL&ceid=PL:pl`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
          },
          cache: "no-store",
        });
        clearTimeout(timeoutId);

        if (!response.ok) return;

        const xml = await response.text();

        // Extract RSS <item> tags
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        let count = 0;

        while ((match = itemRegex.exec(xml)) !== null && count < 2) {
          const itemContent = match[1];

          const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
          const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
          const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
          const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

          if (!titleMatch) continue;

          const rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim();
          const title = rawTitle.replace(/\s+-\s+[^-]+$/, "");

          const link = linkMatch ? linkMatch[1].trim() : undefined;
          const sourceName = sourceMatch
            ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim()
            : "Wiadomości";

          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

          if (pubDate < cutoffDate) continue;

          triggers.push({
            category: q.category,
            title,
            snippet: `Opublikowano w ${sourceName} (${pubDate.toLocaleDateString("pl-PL")}): ${title}`,
            source: sourceName,
            sourceUrl: link,
            publishedAt: pubDate,
            hookSuggestion: q.hookTemplate(title, title),
            confidence: 85,
          });

          count++;
        }
      } catch {
        // Silently skip if query timed out or failed
      }
    })
  );

  return triggers;
}

/**
 * Scrape company website for news, career, and recent achievements
 */
async function fetchWebsiteTriggers(
  website: string,
  cleanName: string
): Promise<ResearchTrigger[]> {
  const triggers: ResearchTrigger[] = [];
  let baseUrl = website.trim();
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `https://${baseUrl}`;
  }

  const subpages = ["", "/aktualnosci", "/news", "/kariera", "/o-nas", "/inwestycje"];

  for (const path of subpages) {
    try {
      const targetUrl = `${baseUrl.replace(/\/$/, "")}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const html = await res.text();

      // Simple regex pattern matcher for key indicators in Polish
      // 1. Hiring / Kariera
      if (
        /dołącz do nas|rekrutujemy|poszukujemy|oferty pracy|do zespołu/i.test(html) &&
        !triggers.some((t) => t.category === "REKRUTACJE")
      ) {
        triggers.push({
          category: "REKRUTACJE",
          title: `Aktywna rekrutacja na stronie ${cleanName}`,
          snippet: `Firma aktywnie publikuje oferty pracy i rekrutuje nowych specjalistów.`,
          source: `Strona WWW (${baseUrl})`,
          sourceUrl: targetUrl,
          publishedAt: new Date(),
          hookSuggestion: `Zauważyłem na Waszej stronie aktywne procesy rekrutacyjne — przy tak dynamicznym rozwoju zespołu, jak radzicie sobie ze skalowaniem narzędzi?`,
          confidence: 80,
        });
      }

      // 2. New Machinery / Technology
      if (
        /park maszynowy|nowoczesne maszyny|nowa linia|automatyzacja produkcji|innowacyjny sprzęt/i.test(
          html
        ) &&
        !triggers.some((t) => t.category === "MASZYNY")
      ) {
        triggers.push({
          category: "MASZYNY",
          title: `Rozbudowa parku maszynowego i technologii`,
          snippet: `Strona firmy informuje o inwestycjach w park maszynowy i automatyzację.`,
          source: `Strona WWW (${baseUrl})`,
          sourceUrl: targetUrl,
          publishedAt: new Date(),
          hookSuggestion: `Zwróciłem uwagę na rozwój Waszego parku maszynowego i inwestycje technologiczne — w związku z tym chciałem zapytać o...`,
          confidence: 80,
        });
      }

      // 3. Expansion / Locations
      if (
        /nowy oddział|nowa hala|nowy magazyn|nowa placówka|nowe biuro/i.test(html) &&
        !triggers.some((t) => t.category === "LOKALIZACJE")
      ) {
        triggers.push({
          category: "LOKALIZACJE",
          title: `Nowa lokalizacja / oddział operacyjny`,
          snippet: `Wzmianka o nowej jednostce, magazynie lub oddziale firmy.`,
          source: `Strona WWW (${baseUrl})`,
          sourceUrl: targetUrl,
          publishedAt: new Date(),
          hookSuggestion: `Widziałem informację o otwarciu Waszej nowej lokalizacji. Gratuluję kolejnego kroku w rozwoju!`,
          confidence: 85,
        });
      }
    } catch {
      // Ignore website fetch errors gracefully (many corporate firewalls or timeouts)
    }
  }

  return triggers;
}

/**
 * Generate LinkedIn research trigger
 */
function generateLinkedInTrigger(cleanName: string): ResearchTrigger {
  const linkedInSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
    cleanName
  )}`;

  return {
    category: "LINKEDIN",
    title: `Profil i aktywność ${cleanName} na LinkedIn`,
    snippet: `Bieżące aktualności, publikacje pracowników i zmiany kadrowe w profilu organizacji.`,
    source: "LinkedIn",
    sourceUrl: linkedInSearchUrl,
    publishedAt: new Date(),
    hookSuggestion: `Śledzę Waszą obecność na LinkedIn i widzę, jak dynamicznie rozwija się ${cleanName} — stąd bezpośredni kontakt.`,
    confidence: 75,
  };
}

/**
 * Fallback contextual triggers generated from BizRaport registry & financial data
 */
function generateContextualTriggers(company: {
  name: string;
  revenue?: number | null;
  employees?: number | null;
  city?: string | null;
  pkdName?: string | null;
  keyPoints?: any;
}): ResearchTrigger[] {
  const cleanName = cleanCompanyName(company.name);
  const triggers: ResearchTrigger[] = [];

  // High Revenue / Market leader hook
  if (company.revenue && company.revenue > 10_000_000) {
    const revMillions = (company.revenue / 1_000_000).toFixed(1);
    triggers.push({
      category: "EKSPANSJA",
      title: `Lider branżowy z obrotem ${revMillions} mln PLN`,
      snippet: `Według sprawozdania finansowego w KRS spółka osiągnęła roczny obrót na poziomie ${revMillions} mln PLN.`,
      source: "Sprawozdanie finansowe KRS",
      publishedAt: new Date(),
      hookSuggestion: `Biorąc pod uwagę Waszą silną pozycję na rynku (${revMillions} mln PLN obrotu w ostatnim sprawozdaniu), chciałem zapytać, jak podchodzicie do dalszego skalowania...`,
      confidence: 90,
    });
  }

  // Key business points triggers from BizRaport
  if (Array.isArray(company.keyPoints) && company.keyPoints.length > 0) {
    const point = company.keyPoints[0];
    triggers.push({
      category: "NEWS",
      title: `Główny filar działalności: ${point}`,
      snippet: `Kluczowa specjalizacja zidentyfikowana w profilu działalności spółki: ${point}`,
      source: "Rejestr KRS / BizRaport",
      publishedAt: new Date(),
      hookSuggestion: `Widzę, że mocno stawiacie na obszar: „${point}”. Zastanawiałem się, jak obecnie wygląda u Was sytuacja z...`,
      confidence: 85,
    });
  }

  return triggers;
}

/**
 * Main research execution for a company:
 * Runs scraping from Google News, website, and registers, synthesizes "Punkty Zaczepienia",
 * and saves everything to the database.
 */
export async function researchCompany(
  companyId: string,
  options: { monthsBack?: number } = {}
): Promise<{
  triggers: ResearchTrigger[];
  primaryHook: string;
}> {
  const monthsBack = options.monthsBack || 12;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error(`Nie znaleziono firmy o ID ${companyId}`);
  }

  // Mark research as running
  await prisma.company.update({
    where: { id: companyId },
    data: { researchStatus: "RUNNING" },
  });

  try {
    const cleanName = cleanCompanyName(company.name);

    // 1. Google News scraping (News, Inwestycje, Nowe maszyny, Ekspansja, Rekrutacje, Nowe lokalizacje)
    const newsTriggers = await fetchGoogleNewsTriggers(company.name, company.city, monthsBack);

    // 2. Company website scraping
    let websiteTriggers: ResearchTrigger[] = [];
    if (company.website) {
      websiteTriggers = await fetchWebsiteTriggers(company.website, cleanName);
    }

    // 3. LinkedIn trigger
    const linkedInTrigger = generateLinkedInTrigger(cleanName);

    // 4. Contextual fallback triggers (if few external news found)
    const contextTriggers = generateContextualTriggers(company);

    // Combine and deduplicate
    const allTriggers: ResearchTrigger[] = [
      ...newsTriggers,
      ...websiteTriggers,
      linkedInTrigger,
      ...contextTriggers,
    ];

    // Priority ordering for primary hook: INWESTYCJE > MASZYNY > EKSPANSJA > LOKALIZACJE > REKRUTACJE > NEWS > LINKEDIN
    const priorityOrder: Record<TriggerCategory, number> = {
      INWESTYCJE: 1,
      MASZYNY: 2,
      EKSPANSJA: 3,
      LOKALIZACJE: 4,
      REKRUTACJE: 5,
      NEWS: 6,
      LINKEDIN: 7,
    };

    allTriggers.sort((a, b) => {
      const prioDiff = (priorityOrder[a.category] || 99) - (priorityOrder[b.category] || 99);
      if (prioDiff !== 0) return prioDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    });

    const primaryHook =
      allTriggers[0]?.hookSuggestion ||
      `Dzień dobry, kontaktuję się w nawiązaniu do dynamicznego rozwoju ${cleanName}...`;

    // Clear existing triggers for this company
    await prisma.companyTrigger.deleteMany({
      where: { companyId },
    });

    // Save newly scraped triggers to the database
    for (const trig of allTriggers) {
      await prisma.companyTrigger.create({
        data: {
          companyId,
          category: trig.category,
          title: trig.title,
          snippet: trig.snippet,
          source: trig.source,
          sourceUrl: trig.sourceUrl,
          publishedAt: trig.publishedAt,
          hookSuggestion: trig.hookSuggestion,
          confidence: trig.confidence,
        },
      });
    }

    // Update company with completed status & primary hook
    await prisma.company.update({
      where: { id: companyId },
      data: {
        researchStatus: "COMPLETED",
        researchedAt: new Date(),
        primaryHook,
      },
    });

    return {
      triggers: allTriggers,
      primaryHook,
    };
  } catch (error: any) {
    console.error(`Błąd researchu dla spółki ${company.name}:`, error);
    await prisma.company.update({
      where: { id: companyId },
      data: { researchStatus: "FAILED" },
    });
    throw error;
  }
}
