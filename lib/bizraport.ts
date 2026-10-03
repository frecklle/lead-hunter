import { prisma } from "@/lib/prisma";
import type { SearchCriteria } from "@/types/search";

// ── Environment Credentials ──────────────────────────────────────────────────
const BIZRAPORT_EMAIL = process.env.BIZRAPORT_EMAIL || "oracicki@gmail.com";
const BIZRAPORT_PASSWORD = process.env.BIZRAPORT_PASSWORD || "csuHaf3rxXuFu2yu8cYbm1Uu";
const BIZRAPORT_API_URL = process.env.BIZRAPORT_API_URL || "https://api.bizraport.pl/api";

// Voivodeship normalizer for BizRaport API (uppercase, no hyphens, no Polish diacritics)
const VOIVODESHIP_MAP: Record<string, string> = {
  "DOLNOŚLĄSKIE": "DOLNOSLASKIE",
  "KUJAWSKO-POMORSKIE": "KUJAWSKOPOMORSKIE",
  "LUBELSKIE": "LUBELSKIE",
  "LUBUSKIE": "LUBUSKIE",
  "ŁÓDZKIE": "LODZKIE",
  "MAŁOPOLSKIE": "MALOPOLSKIE",
  "MAZOWIECKIE": "MAZOWIECKIE",
  "OPOLSKIE": "OPOLSKIE",
  "PODKARPACKIE": "PODKARPACKIE",
  "PODLASKIE": "PODLASKIE",
  "POMORSKIE": "POMORSKIE",
  "ŚLĄSKIE": "SLASKIE",
  "ŚWIĘTOKRZYSKIE": "SWIETOKRZYSKIE",
  "WARMIŃSKO-MAZURSKIE": "WARMINSKOMAZURSKIE",
  "WIELKOPOLSKIE": "WIELKOPOLSKIE",
  "ZACHODNIOPOMORSKIE": "ZACHODNIOPOMORSKIE",
};

export function normalizeVoivodeship(v?: string): string | undefined {
  if (!v) return undefined;
  const upper = v.trim().toUpperCase();
  return VOIVODESHIP_MAP[upper] || upper.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "");
}

// ── Raw BizRaport API Types ───────────────────────────────────────────────────

export interface BizRaportInfoItem {
  nazwa_pola: string;
  wartosc: string;
}

export interface BizRaportFinancialItem {
  okres_sprawozdawczy: string;
  kwota: number;
  nazwa_wskaznika: string;
  rok: number;
}

export interface BizRaportDescriptionItem {
  opis?: string;
  punkt_kluczowy_1?: string;
  punkt_kluczowy_2?: string;
  punkt_kluczowy_3?: string;
  punkt_kluczowy_4?: string;
  punkt_kluczowy_5?: string;
}

export interface BizRaportConnectionItem {
  typ_podmiotu: string;
  nazwa: string;
  typ_powiazania: string;
  id_podmiotu: string | null;
  organ: string | null;
  funkcja: string | null;
}

export interface BizRaportShareholderItem {
  typ_podmiotu: string;
  nazwa: string;
  procent_udzialow: number | null;
  id_podmiotu: string | null;
}

export interface BizRaportRawCompany {
  krs: string;
  nip: number | string | null;
  kod_pkd: string | null;
  opis_pkd: string | null;
  informacje_o_firmie?: BizRaportInfoItem[] | null;
  dane_finansowe?: BizRaportFinancialItem[] | null;
  opisy_firmy?: BizRaportDescriptionItem[] | null;
  powiazania?: BizRaportConnectionItem[] | null;
  udzialy?: BizRaportShareholderItem[] | null;
  pozycja_na_tle_branzy?: any[] | null;
  krz?: any[] | null;
  monitor_sadowy?: any[] | null;
}

export interface BizRaportUsage {
  miesiac: string;
  model: string;
  zuzycie: {
    "/dane": number;
    "/katalog": number;
    "/szukaj": number;
    "/sprawozdania": number;
  };
  pula: number;
  odpytania_razem: number;
  odpytania_w_abonamencie: number;
  odpytania_ponad_abonament: number;
}

// ── API Methods ───────────────────────────────────────────────────────────────

/**
 * Check current BizRaport API account usage (Free call, doesn't count against limit)
 */
export async function getApiUsage(): Promise<BizRaportUsage> {
  const url = new URL(`${BIZRAPORT_API_URL}/zuzycie`);
  url.searchParams.set("email", BIZRAPORT_EMAIL);
  url.searchParams.set("password", BIZRAPORT_PASSWORD);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Błąd BizRaport API /zuzycie (${res.status}): ${errorText}`);
  }
  return res.json();
}

/**
 * Search company by phrase / keyword / NIP / KRS using /api/szukaj
 */
export async function searchByQuery(phrase: string): Promise<string[]> {
  if (!phrase || phrase.trim().length < 3) return [];

  const url = new URL(`${BIZRAPORT_API_URL}/szukaj`);
  url.searchParams.set("email", BIZRAPORT_EMAIL);
  url.searchParams.set("password", BIZRAPORT_PASSWORD);
  url.searchParams.set("q", phrase.trim());

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Błąd wyszukiwania BizRaport: ${err}`);
  }

  const json = await res.json();
  const list: { krs: string }[] = json.data || [];
  return list.map((item) => item.krs);
}

/**
 * Filter catalog using /api/katalog based on SearchCriteria
 */
export async function searchCatalog(
  criteria: SearchCriteria,
  maxResults = 25
): Promise<{ krsList: string[]; totalCount: number }> {
  const url = new URL(`${BIZRAPORT_API_URL}/katalog`);
  url.searchParams.set("email", BIZRAPORT_EMAIL);
  url.searchParams.set("password", BIZRAPORT_PASSWORD);

  let hasAtLeastOneFilter = false;

  // 1. Financial thresholds
  if (typeof criteria.revenueMin === "number" && criteria.revenueMin > 0) {
    url.searchParams.set("przychody_od", String(Math.round(criteria.revenueMin)));
    hasAtLeastOneFilter = true;
  }
  if (typeof criteria.revenueMax === "number" && criteria.revenueMax > 0) {
    url.searchParams.set("przychody_do", String(Math.round(criteria.revenueMax)));
    hasAtLeastOneFilter = true;
  }
  if (typeof criteria.netProfitMin === "number" && criteria.netProfitMin > 0) {
    url.searchParams.set("zysk_netto_od", String(Math.round(criteria.netProfitMin)));
    hasAtLeastOneFilter = true;
  }
  if (typeof criteria.ebitdaMin === "number" && criteria.ebitdaMin > 0) {
    url.searchParams.set("ebitda_od", String(Math.round(criteria.ebitdaMin)));
    hasAtLeastOneFilter = true;
  }

  // 2. Employees count
  if (typeof criteria.employeesMin === "number" && criteria.employeesMin > 0) {
    url.searchParams.set("zatrudnienie_od", String(Math.round(criteria.employeesMin)));
    hasAtLeastOneFilter = true;
  }
  if (typeof criteria.employeesMax === "number" && criteria.employeesMax > 0) {
    url.searchParams.set("zatrudnienie_do", String(Math.round(criteria.employeesMax)));
    hasAtLeastOneFilter = true;
  }

  // 3. CAGR growth
  if (typeof criteria.cagrRevenueMin === "number" && criteria.cagrRevenueMin > 0) {
    // BizRaport expects integer percentage, e.g. 15 for 15%
    url.searchParams.set("srednioroczny_wzrost_przychodow_1_rok_od", String(Math.round(criteria.cagrRevenueMin)));
    hasAtLeastOneFilter = true;
  }

  // 4. Industry & PKD
  if (criteria.pkdCodes && criteria.pkdCodes.length > 0) {
    url.searchParams.set("pkd_podklasa", criteria.pkdCodes[0].trim().toUpperCase());
    hasAtLeastOneFilter = true;
  } else if (criteria.pkdDivision) {
    url.searchParams.set("pkd_dzial", criteria.pkdDivision.trim());
    hasAtLeastOneFilter = true;
  } else if (criteria.pkdSection) {
    url.searchParams.set("pkd_sekcja", criteria.pkdSection.trim().toUpperCase());
    hasAtLeastOneFilter = true;
  }

  // 5. Location
  if (criteria.city && criteria.city.trim()) {
    url.searchParams.set("miasto", criteria.city.trim());
    hasAtLeastOneFilter = true;
  }

  // If fewer than all 16 voivodeships are chosen, pick the first one to filter
  if (criteria.voivodeships && criteria.voivodeships.length > 0 && criteria.voivodeships.length < 16) {
    const norm = normalizeVoivodeship(criteria.voivodeships[0]);
    if (norm) {
      url.searchParams.set("wojewodztwo", norm);
      hasAtLeastOneFilter = true;
    }
  }

  // 6. Active only
  if (criteria.onlyActive) {
    url.searchParams.set("nie_wykreslona", "tak");
    hasAtLeastOneFilter = true;
  }

  // 7. Text description
  if (criteria.query && criteria.query.trim()) {
    url.searchParams.set("opis", criteria.query.trim());
    hasAtLeastOneFilter = true;
  }

  // BizRaport requires at least one filter; provide default if empty
  if (!hasAtLeastOneFilter) {
    url.searchParams.set("nie_wykreslona", "tak");
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Błąd BizRaport API /katalog (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawList: { krs: string }[] = data.data || [];
  const totalCount = data.count || rawList.length;

  // Limit results to preserve API quotas
  const krsList = rawList.slice(0, maxResults).map((item) => item.krs);

  return { krsList, totalCount };
}

/**
 * Fetch full company report by KRS using /api/dane
 */
export async function getCompanyByKrs(krs: string): Promise<BizRaportRawCompany | null> {
  const cleanKrs = krs.replace(/[^0-9]/g, "");
  const url = new URL(`${BIZRAPORT_API_URL}/dane`);
  url.searchParams.set("email", BIZRAPORT_EMAIL);
  url.searchParams.set("password", BIZRAPORT_PASSWORD);
  url.searchParams.set("krs", cleanKrs);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorText = await res.text();
    throw new Error(`Błąd BizRaport API /dane (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  const company = json.data?.[0] || null;
  return company;
}

// ── Lead Scoring & Parsing Helpers ────────────────────────────────────────────

export interface ParsedCompanyDetails {
  krs: string;
  name: string;
  nip: string | null;
  regon: string | null;
  legalForm: string | null;
  revenue: number | null;
  netProfit: number | null;
  ebitda: number | null;
  equity: number | null;
  companyValue: number | null;
  creditLimit: number | null;
  employees: number | null;
  reliabilityScore: number | null;
  riskProbability: number | null;
  pkd: string | null;
  pkdName: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  voivodeship: string | null;
  website: string | null;
  email: string | null;
  description: string | null;
  keyPoints: string[];
  shareholders: any[];
  management: any[];
  score: number;
  scoreReason: string;
}

/**
 * Convert raw BizRaport response into structured model with intelligent lead score
 */
export function parseAndScoreCompany(
  raw: BizRaportRawCompany,
  criteria?: SearchCriteria
): ParsedCompanyDetails {
  // 1. Parse Info map
  const infoMap = new Map<string, string>();
  if (Array.isArray(raw.informacje_o_firmie)) {
    for (const item of raw.informacje_o_firmie) {
      if (item.nazwa_pola && item.wartosc) {
        infoMap.set(item.nazwa_pola, item.wartosc.trim());
      }
    }
  }

  const name = infoMap.get("nazwa") || `Spółka KRS ${raw.krs}`;
  const nip = raw.nip ? String(raw.nip) : infoMap.get("nip") || null;
  const regon = infoMap.get("regon") || null;
  const legalForm = infoMap.get("forma_prawna") || null;
  const street = infoMap.get("ulica")
    ? `${infoMap.get("ulica")} ${infoMap.get("numer_nieruchomosci") || ""}`.trim()
    : null;
  const city = infoMap.get("miejscowosc") || null;
  const postalCode = infoMap.get("kod_pocztowy") || null;
  const voivodeship = infoMap.get("wojewodztwo") || null;
  const website = infoMap.get("adres_strony_internetowej") || null;
  const email = infoMap.get("email") || null;

  // 2. Parse Financials
  // Look for latest reporting period (first items in array)
  let revenue: number | null = null;
  let netProfit: number | null = null;
  let ebitda: number | null = null;
  let equity: number | null = null;
  let companyValue: number | null = null;
  let creditLimit: number | null = null;
  let employees: number | null = null;
  let reliabilityScore: number | null = null;
  let riskProbability: number | null = null;

  if (Array.isArray(raw.dane_finansowe) && raw.dane_finansowe.length > 0) {
    // Sort latest periods first if not already
    for (const fin of raw.dane_finansowe) {
      if (revenue === null && (fin.nazwa_wskaznika === "przychody" || fin.nazwa_wskaznika === "przychody_ze_sprzedazy")) {
        revenue = fin.kwota;
      }
      if (netProfit === null && fin.nazwa_wskaznika === "zysk_netto") {
        netProfit = fin.kwota;
      }
      if (ebitda === null && fin.nazwa_wskaznika === "ebitda") {
        ebitda = fin.kwota;
      }
      if (equity === null && fin.nazwa_wskaznika === "kapital_wlasny") {
        equity = fin.kwota;
      }
      if (companyValue === null && fin.nazwa_wskaznika === "wartosc_firmy_srednia") {
        companyValue = fin.kwota;
      }
      if (creditLimit === null && fin.nazwa_wskaznika === "kredyt_kupiecki_sredni") {
        creditLimit = fin.kwota;
      }
      if (employees === null && (fin.nazwa_wskaznika === "zatrudnienie" || fin.nazwa_wskaznika === "zatrudnienie_estymowane")) {
        employees = Math.round(fin.kwota);
      }
      if (reliabilityScore === null && fin.nazwa_wskaznika === "wiarygodnosc") {
        reliabilityScore = Math.round(fin.kwota);
      }
      if (riskProbability === null && fin.nazwa_wskaznika === "niewyplacalnosc_lub_restrukturyzacja_24m") {
        riskProbability = Number((fin.kwota * 100).toFixed(1));
      }
    }
  }

  // 3. Description & Key points
  let description: string | null = null;
  const keyPoints: string[] = [];
  if (Array.isArray(raw.opisy_firmy) && raw.opisy_firmy.length > 0) {
    const firstDesc = raw.opisy_firmy[0];
    description = firstDesc.opis || null;
    if (firstDesc.punkt_kluczowy_1) keyPoints.push(firstDesc.punkt_kluczowy_1);
    if (firstDesc.punkt_kluczowy_2) keyPoints.push(firstDesc.punkt_kluczowy_2);
    if (firstDesc.punkt_kluczowy_3) keyPoints.push(firstDesc.punkt_kluczowy_3);
    if (firstDesc.punkt_kluczowy_4) keyPoints.push(firstDesc.punkt_kluczowy_4);
    if (firstDesc.punkt_kluczowy_5) keyPoints.push(firstDesc.punkt_kluczowy_5);
  }

  // 4. Shareholders & Management
  const shareholders = Array.isArray(raw.udzialy)
    ? raw.udzialy.slice(0, 10).map((u) => ({
        name: u.nazwa,
        percentage: u.procent_udzialow,
        type: u.typ_podmiotu,
      }))
    : [];

  const management = Array.isArray(raw.powiazania)
    ? raw.powiazania
        .filter((p) => p.typ_powiazania === "reprezentacja" || p.organ?.toLowerCase().includes("zarząd"))
        .slice(0, 8)
        .map((p) => ({
          name: p.nazwa,
          role: p.funkcja || p.typ_powiazania,
          organ: p.organ,
        }))
    : [];

  // 5. Intelligent Lead Scoring (0 - 100)
  let score = 50; // baseline
  const reasons: string[] = [];

  // Revenue evaluation
  if (revenue && revenue > 0) {
    if (criteria?.revenueMin && revenue >= criteria.revenueMin) {
      score += 15;
      reasons.push(`Przychód ${(revenue / 1_000_000).toFixed(1)}M PLN spełnia próg`);
    } else if (revenue > 10_000_000) {
      score += 15;
      reasons.push(`Duża skala: obrót ${(revenue / 1_000_000).toFixed(1)}M PLN`);
    } else if (revenue > 2_000_000) {
      score += 10;
      reasons.push(`Stabilny obrót ${(revenue / 1_000_000).toFixed(1)}M PLN`);
    }
  }

  // Profitability & EBITDA
  if (netProfit && netProfit > 0) {
    score += 10;
    reasons.push(`Rentowna spółka (zysk ${(netProfit / 1_000).toFixed(0)}k PLN)`);
  }
  if (ebitda && ebitda > 0) {
    score += 5;
  }

  // Creditworthiness (1 to 5, 1 highest)
  if (reliabilityScore !== null) {
    if (reliabilityScore === 1) {
      score += 15;
      reasons.push("Najwyższa wiarygodność płatnicza (1/5)");
    } else if (reliabilityScore === 2) {
      score += 10;
      reasons.push("Bardzo dobra wiarygodność (2/5)");
    } else if (reliabilityScore >= 4) {
      score -= 15;
      reasons.push("Obniżona ocena wiarygodności");
    }
  }

  // Insolvency risk
  if (riskProbability !== null && riskProbability > 25) {
    score -= 20;
    reasons.push(`Podwyższone ryzyko restrukturyzacji (${riskProbability}%)`);
  }

  // Contact availability
  if (website || email) {
    score += 5;
    reasons.push("Dostępne dane kontaktowe");
  }

  // Headcount fit
  if (employees && employees > 5) {
    score += 5;
    reasons.push(`Zespół ${employees} osób`);
  }

  // Clamping score between 10 and 99
  const finalScore = Math.max(10, Math.min(98, score));
  const scoreReason = reasons.length > 0 ? reasons.join(" • ") : "Standardowy profil spółki";

  return {
    krs: raw.krs,
    name,
    nip,
    regon,
    legalForm,
    revenue,
    netProfit,
    ebitda,
    equity,
    companyValue,
    creditLimit,
    employees,
    reliabilityScore,
    riskProbability,
    pkd: raw.kod_pkd || null,
    pkdName: raw.opis_pkd || null,
    street,
    city,
    postalCode,
    voivodeship,
    website,
    email,
    description,
    keyPoints,
    shareholders,
    management,
    score: finalScore,
    scoreReason,
  };
}

/**
 * Execute full search pipeline: query catalog, fetch company details, save to database
 */
export async function runBizRaportSearch(
  searchId: string,
  options: { maxCompanies?: number } = {}
): Promise<{ addedCount: number; totalFound: number }> {
  const maxCompanies = options.maxCompanies || 15;

  const search = await prisma.search.findUnique({
    where: { id: searchId },
  });

  if (!search) {
    throw new Error(`Nie znaleziono konfiguracji wyszukiwania o ID ${searchId}`);
  }

  const criteria = (search.criteria as unknown as SearchCriteria) || {};

  // Update status to RUNNING
  await prisma.search.update({
    where: { id: searchId },
    data: { status: "RUNNING", errorMessage: null },
  });

  try {
    let krsList: string[] = [];
    let totalCount = 0;

    // Check if user specified a name / text query without other filters, or full catalog search
    if (criteria.query && !criteria.revenueMin && !criteria.pkdSection && !criteria.voivodeships?.length) {
      // Use /api/szukaj for direct keyword search
      krsList = await searchByQuery(criteria.query);
      totalCount = krsList.length;
      krsList = krsList.slice(0, maxCompanies);
    } else {
      // Use /api/katalog for multi-criteria search
      const catalogResult = await searchCatalog(criteria, maxCompanies);
      krsList = catalogResult.krsList;
      totalCount = catalogResult.totalCount;
    }

    let addedCount = 0;

    // Fetch details for each KRS (with concurrency control)
    for (const krs of krsList) {
      try {
        const rawCompany = await getCompanyByKrs(krs);
        if (!rawCompany) continue;

        const parsed = parseAndScoreCompany(rawCompany, criteria);

        await prisma.company.upsert({
          where: {
            searchId_krs: {
              searchId,
              krs: parsed.krs,
            },
          },
          update: {
            name: parsed.name,
            nip: parsed.nip,
            regon: parsed.regon,
            legalForm: parsed.legalForm,
            revenue: parsed.revenue,
            netProfit: parsed.netProfit,
            ebitda: parsed.ebitda,
            equity: parsed.equity,
            companyValue: parsed.companyValue,
            creditLimit: parsed.creditLimit,
            employees: parsed.employees,
            reliabilityScore: parsed.reliabilityScore,
            riskProbability: parsed.riskProbability,
            score: parsed.score,
            scoreReason: parsed.scoreReason,
            pkd: parsed.pkd,
            pkdName: parsed.pkdName,
            street: parsed.street,
            city: parsed.city,
            postalCode: parsed.postalCode,
            voivodeship: parsed.voivodeship,
            website: parsed.website,
            email: parsed.email,
            description: parsed.description,
            keyPoints: parsed.keyPoints as any,
            shareholders: parsed.shareholders as any,
            management: parsed.management as any,
          },
          create: {
            searchId,
            krs: parsed.krs,
            name: parsed.name,
            nip: parsed.nip,
            regon: parsed.regon,
            legalForm: parsed.legalForm,
            revenue: parsed.revenue,
            netProfit: parsed.netProfit,
            ebitda: parsed.ebitda,
            equity: parsed.equity,
            companyValue: parsed.companyValue,
            creditLimit: parsed.creditLimit,
            employees: parsed.employees,
            reliabilityScore: parsed.reliabilityScore,
            riskProbability: parsed.riskProbability,
            score: parsed.score,
            scoreReason: parsed.scoreReason,
            pkd: parsed.pkd,
            pkdName: parsed.pkdName,
            street: parsed.street,
            city: parsed.city,
            postalCode: parsed.postalCode,
            voivodeship: parsed.voivodeship,
            website: parsed.website,
            email: parsed.email,
            description: parsed.description,
            keyPoints: parsed.keyPoints as any,
            shareholders: parsed.shareholders as any,
            management: parsed.management as any,
          },
        });

        addedCount++;
      } catch (companyError) {
        console.warn(`Błąd pobierania szczegółów KRS ${krs}:`, companyError);
      }
    }

    // Mark as DONE
    await prisma.search.update({
      where: { id: searchId },
      data: {
        status: "DONE",
        resultsCount: totalCount,
        lastRunAt: new Date(),
        errorMessage: null,
      },
    });

    return { addedCount, totalFound: totalCount };
  } catch (error: any) {
    console.error("Błąd podczas pipeline wyszukiwania BizRaport:", error);
    await prisma.search.update({
      where: { id: searchId },
      data: {
        status: "ERROR",
        errorMessage: error.message || "Błąd wykonania zapytania do BizRaport",
      },
    });
    throw error;
  }
}
