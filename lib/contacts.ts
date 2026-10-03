/**
 * Contact Finder & Decision Maker Discovery Engine
 * 
 * Target profiles:
 * - CEO / Prezes Zarządu
 * - Właściciel / Wspólnik
 * - Dyrektor (Zarządzający, Operacyjny, Handlowy, Finansowy)
 * - Osoba odpowiedzialna za dany obszar (Inwestycje, Maszyny, Ekspansja, Rekrutacja)
 */

import { prisma } from "./prisma";

export interface DiscoveredContact {
  id?: string;
  name: string;
  role: string;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  source: string;
  sourceUrl?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
}

/**
 * Format Polish uppercase KRS name "NAZWISKO IMIĘ" or "NAZWISKO IMIĘ DRUGIE"
 * to natural Title Case: "Imię Nazwisko"
 */
export function formatKrsPersonName(rawName: string): string {
  if (!rawName) return "";
  const parts = rawName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  }

  // Common Portuguese/foreign names or multi-part surnames
  const titleCased = parts.map(
    (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  );

  // In Polish KRS, standard format is usually SURNAME FIRST_NAME [MIDDLE_NAME]
  // If 2 parts: [Surname, First] -> First Surname
  if (parts.length === 2) {
    return `${titleCased[1]} ${titleCased[0]}`;
  }

  // If 3 parts: [Surname, First, Second] -> First Second Surname
  if (parts.length === 3) {
    return `${titleCased[1]} ${titleCased[2]} ${titleCased[0]}`;
  }

  // If longer (e.g. DE CASTRO SOARES DOS SANTOS PEDRO MANUEL)
  // return title-cased as-is
  return titleCased.join(" ");
}

/**
 * Clean & extract root domain from company website
 */
export function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^www\./i, "");
  clean = clean.split("/")[0].split(":")[0];
  if (clean.includes(".") && clean.length > 3) {
    return clean;
  }
  return null;
}

/**
 * Generate likely corporate email address from name and domain
 */
export function generateCorporateEmail(
  fullName: string,
  domain: string
): string | null {
  if (!fullName || !domain) return null;
  const parts = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove polish diacritics
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/);

  if (parts.length < 2) return null;
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  // Most common Polish corporate format: imie.nazwisko@domena.pl
  return `${firstName}.${lastName}@${domain}`;
}

/**
 * Build tailored LinkedIn people search URL
 */
export function buildLinkedInSearchUrl(
  companyName: string,
  personName?: string,
  roleKeywords?: string
): string {
  const cleanComp = companyName
    .replace(/SPÓŁKA.*$/i, "")
    .replace(/SP\..*$/i, "")
    .replace(/S\.A\..*$/i, "")
    .replace(/Z O\.O\..*$/i, "")
    .trim();

  let query = "";
  if (personName) {
    query = `"${personName}" "${cleanComp}"`;
  } else if (roleKeywords) {
    query = `"${cleanComp}" (${roleKeywords})`;
  } else {
    query = `"${cleanComp}" (CEO OR Prezes OR Dyrektor OR Właściciel)`;
  }

  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    query
  )}`;
}

/**
 * Scrape company website for decision makers, emails and phone numbers
 */
async function scrapeWebsiteContacts(
  websiteUrl: string,
  companyName: string
): Promise<DiscoveredContact[]> {
  const contacts: DiscoveredContact[] = [];
  const domain = extractDomain(websiteUrl);
  if (!domain) return contacts;

  const baseOrigin = websiteUrl.startsWith("http")
    ? websiteUrl
    : `https://${websiteUrl}`;

  // Candidate contact paths to inspect
  const candidatePaths = [
    "",
    "/kontakt",
    "/contact",
    "/o-nas",
    "/about",
    "/zespol",
    "/team",
    "/zarzad",
    "/wladze-spolki",
    "/relacje-inwestorskie",
    "/dla-mediow",
  ];

  const fetchedEmails = new Set<string>();
  const fetchedPhones = new Set<string>();

  for (const path of candidatePaths.slice(0, 4)) {
    const targetUrl = path ? `${baseOrigin.replace(/\/$/, "")}${path}` : baseOrigin;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 LeadHunter/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const html = await res.text();

      // 1. Extract email addresses
      const emailMatches = html.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      );
      if (emailMatches) {
        for (const rawEmail of emailMatches) {
          const email = rawEmail.toLowerCase().trim();
          // Filter out asset / false positive extensions
          if (
            email.endsWith(".png") ||
            email.endsWith(".jpg") ||
            email.endsWith(".svg") ||
            email.includes("sentry") ||
            email.includes("wixpress") ||
            email.includes("example.com") ||
            email.includes("schema.org") ||
            email.includes("cloudflare")
          ) {
            continue;
          }
          fetchedEmails.add(email);
        }
      }

      // 2. Extract phone numbers
      const phoneMatches = html.match(
        /(?:\+?48\s?)?(?:[1-9]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}|[1-9]\d{1}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/g
      );
      if (phoneMatches) {
        for (const p of phoneMatches.slice(0, 3)) {
          const cleaned = p.replace(/\s+/g, " ").trim();
          if (cleaned.length >= 9) fetchedPhones.add(cleaned);
        }
      }

      // 3. Search for executive titles in page text
      const executivePatterns = [
        {
          regex: /(?:Prezes\s+Zarządu|Prezes|CEO)\s*[:\-–]?\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i,
          role: "Prezes Zarządu (CEO)",
          dept: "Zarząd / CEO",
          isPrimary: true,
        },
        {
          regex: /(?:Właściciel|Founder|Założyciel)\s*[:\-–]?\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i,
          role: "Właściciel / Założyciel",
          dept: "Właściciel",
          isPrimary: true,
        },
        {
          regex: /(?:Dyrektor\s+Zarządzający|Managing\s+Director)\s*[:\-–]?\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i,
          role: "Dyrektor Zarządzający",
          dept: "Zarząd",
          isPrimary: false,
        },
        {
          regex: /(?:Dyrektor\s+ds\.\s+Inwestycji|Dyrektor\s+Techniczny|Dyrektor\s+Produkcji)\s*[:\-–]?\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i,
          role: "Dyrektor ds. Inwestycji / Techniczny",
          dept: "Inwestycje i Produkcja",
          isPrimary: false,
        },
        {
          regex: /(?:Dyrektor\s+Handlowy|Dyrektor\s+ds\.\s+Sprzedaży|Head\s+of\s+Sales)\s*[:\-–]?\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i,
          role: "Dyrektor Handlowy / Sprzedaży",
          dept: "Handel i Sprzedaż",
          isPrimary: false,
        },
      ];

      for (const pattern of executivePatterns) {
        const match = html.match(pattern.regex);
        if (match && match[1]) {
          const personName = match[1].trim();
          if (
            !contacts.some(
              (c) => c.name.toLowerCase() === personName.toLowerCase()
            )
          ) {
            contacts.push({
              name: personName,
              role: pattern.role,
              department: pattern.dept,
              isPrimary: pattern.isPrimary,
              source: "Strona WWW (scraping)",
              sourceUrl: targetUrl,
              linkedinUrl: buildLinkedInSearchUrl(companyName, personName),
              email: domain
                ? generateCorporateEmail(personName, domain) || undefined
                : undefined,
              phone: Array.from(fetchedPhones)[0],
            });
          }
        }
      }
    } catch {
      // Timeout or offline page — continue gracefully
    }
  }

  // If generic contact email / phone was found on website, make sure it's available
  if (contacts.length === 0 && (fetchedEmails.size > 0 || fetchedPhones.size > 0)) {
    const primaryEmail = Array.from(fetchedEmails)[0];
    const primaryPhone = Array.from(fetchedPhones)[0];

    contacts.push({
      name: "Dział Zarządu / Kontakt Oficjalny",
      role: "Biuro Zarządu / Sekretariat",
      department: "Zarząd / CEO",
      email: primaryEmail,
      phone: primaryPhone,
      source: "Strona WWW (scraping)",
      sourceUrl: baseOrigin,
      isPrimary: true,
      linkedinUrl: buildLinkedInSearchUrl(companyName, undefined, "Zarząd OR Dyrektor"),
    });
  }

  return contacts;
}

/**
 * Discovers contacts for a company from:
 * 1. KRS / BizRaport Officers (Zarząd, Prezes, Właściciele, Reprezentacja)
 * 2. Website Scraping (/kontakt, /o-nas, /zarzad, emails, phones)
 * 3. Area-Specific Decision Maker tailored to company triggers (Inwestycje, Maszyny, Ekspansja)
 * 4. LinkedIn targeted lookups
 */
export async function discoverCompanyContacts(
  companyId: string
): Promise<DiscoveredContact[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      triggers: true,
      contacts: true,
    },
  });

  if (!company) {
    throw new Error(`Company with id ${companyId} not found`);
  }

  const domain = extractDomain(company.website);
  const discovered: DiscoveredContact[] = [];
  const existingNames = new Set(
    company.contacts.map((c) => c.name.toLowerCase().trim())
  );

  // ── 1. KRS / BizRaport Management & Ownership ──────────────────────────────
  const rawMgmt = Array.isArray(company.management)
    ? (company.management as any[])
    : [];

  let hasPrimaryCeo = false;

  for (const m of rawMgmt) {
    if (!m.name) continue;
    const cleanRawName = String(m.name).trim();
    // Ignore corporate legal entity names listed as partners (e.g. "LIDL", "SPÓŁKA Z O.O.")
    if (
      cleanRawName.length < 3 ||
      cleanRawName.includes("SPÓŁKA") ||
      cleanRawName.includes("SP. Z O.O.") ||
      cleanRawName === company.name.toUpperCase()
    ) {
      continue;
    }

    const formattedName = formatKrsPersonName(cleanRawName);
    if (existingNames.has(formattedName.toLowerCase())) continue;

    const rawRole = String(m.role || "").toUpperCase();
    let role = "Członek Zarządu";
    let department = "Zarząd";
    let isPrimary = false;

    if (rawRole.includes("PREZES")) {
      role = "Prezes Zarządu (CEO)";
      department = "Zarząd / CEO";
      isPrimary = !hasPrimaryCeo;
      hasPrimaryCeo = true;
    } else if (rawRole.includes("WICEPREZES")) {
      role = "Wiceprezes Zarządu";
      department = "Zarząd";
    } else if (rawRole.includes("WSPÓLNIK") || rawRole.includes("KOMPLEMENTARIUSZ")) {
      role = "Właściciel / Wspólnik";
      department = "Właściciel";
      isPrimary = !hasPrimaryCeo;
      if (isPrimary) hasPrimaryCeo = true;
    } else if (rawRole.includes("PROKURENT")) {
      role = "Prokurent";
      department = "Reprezentacja";
    }

    const corporateEmail = domain
      ? generateCorporateEmail(formattedName, domain)
      : undefined;

    const linkedinUrl = buildLinkedInSearchUrl(company.name, formattedName);

    discovered.push({
      name: formattedName,
      role,
      department,
      email: corporateEmail || company.email || undefined,
      linkedinUrl,
      source: "KRS / BizRaport",
      sourceUrl: `https://rejestr.io/krs/${company.krs.replace(/\D/g, "")}`,
      isPrimary,
      notes: `Powołany w organie: ${m.organ || "Zarząd"} (${m.role || "Reprezentacja"})`,
    });

    existingNames.add(formattedName.toLowerCase());
  }

  // ── 2. Website Scraping for Direct Executive Contacts ───────────────────────
  if (company.website) {
    const webContacts = await scrapeWebsiteContacts(
      company.website,
      company.name
    );

    for (const wc of webContacts) {
      if (!existingNames.has(wc.name.toLowerCase())) {
        if (wc.isPrimary && hasPrimaryCeo) {
          wc.isPrimary = false; // keep single primary CEO
        }
        discovered.push(wc);
        existingNames.add(wc.name.toLowerCase());
      }
    }
  }

  // ── 3. Area-Specific Decision Maker (based on discovered triggers) ──────────
  // If company has triggers in INWESTYCJE, MASZYNY, EKSPANSJA, or REKRUTACJE,
  // identify the exact functional department head to contact!
  const hasInvestment = company.triggers.some((t) => t.category === "INWESTYCJE");
  const hasMachines = company.triggers.some((t) => t.category === "MASZYNY");
  const hasExpansion = company.triggers.some((t) => t.category === "EKSPANSJA");
  const hasHiring = company.triggers.some((t) => t.category === "REKRUTACJE");

  if (hasInvestment || hasMachines) {
    const areaName = hasMachines
      ? "Dyrektor Produkcji / Parku Maszynowego"
      : "Dyrektor ds. Inwestycji / Rozwoju Technicznego";
    const areaRole = hasMachines
      ? "Dyrektor Produkcji / Utrzymania Ruchu"
      : "Dyrektor ds. Inwestycji / CAPEX";
    const keywords = hasMachines
      ? "Dyrektor Produkcji OR Utrzymania Ruchu OR Automatyzacji"
      : "Dyrektor ds. Inwestycji OR Dyrektor Techniczny OR Dyrektor Rozwoju";

    discovered.push({
      name: `Osoba odpowiedzialna za Inwestycje / Maszyny`,
      role: areaRole,
      department: "Inwestycje & Nowe Technologie",
      email: domain ? `inwestycje@${domain}` : company.email || undefined,
      linkedinUrl: buildLinkedInSearchUrl(company.name, undefined, keywords),
      source: "Punkt Zaczepienia (Dopasowanie)",
      sourceUrl: company.triggers.find((t) => t.category === "INWESTYCJE" || t.category === "MASZYNY")?.sourceUrl || undefined,
      isPrimary: !hasPrimaryCeo && discovered.length === 0,
      notes: `Kluczowa osoba do rozmowy nt. aktualnych inwestycji i maszyn firmy.`,
    });
  } else if (hasExpansion) {
    discovered.push({
      name: `Osoba odpowiedzialna za Ekspansję i Rozwój`,
      role: "Dyrektor Handlowy / Head of Business Development",
      department: "Ekspansja i Sprzedaż",
      email: domain ? `handel@${domain}` : company.email || undefined,
      linkedinUrl: buildLinkedInSearchUrl(company.name, undefined, "Dyrektor Handlowy OR Business Development OR Ekspansja"),
      source: "Punkt Zaczepienia (Dopasowanie)",
      sourceUrl: company.triggers.find((t) => t.category === "EKSPANSJA")?.sourceUrl || undefined,
      isPrimary: false,
      notes: `Kluczowa osoba do rozmowy nt. ekspansji rynkowej i nowych lokalizacji.`,
    });
  } else if (hasHiring) {
    discovered.push({
      name: `Osoba odpowiedzialna za Kadry i Zespół`,
      role: "Dyrektor HR / Head of People",
      department: "HR & Rekrutacja",
      email: domain ? `rekrutacja@${domain}` : company.email || undefined,
      linkedinUrl: buildLinkedInSearchUrl(company.name, undefined, "Dyrektor HR OR Rekrutacja OR People"),
      source: "Punkt Zaczepienia (Dopasowanie)",
      sourceUrl: company.triggers.find((t) => t.category === "REKRUTACJE")?.sourceUrl || undefined,
      isPrimary: false,
      notes: `Kluczowa osoba do rozmowy nt. powiększania zespołów i rekrutacji.`,
    });
  }

  // ── 4. Fallback if no specific contacts found ──────────────────────────────
  if (discovered.length === 0) {
    discovered.push({
      name: `Właściciel / Dyrektor Generalny`,
      role: "CEO / Właściciel",
      department: "Zarząd / CEO",
      email: company.email || (domain ? `biuro@${domain}` : undefined),
      linkedinUrl: buildLinkedInSearchUrl(company.name, undefined, "CEO OR Prezes OR Właściciel OR Dyrektor"),
      source: "Weryfikacja LinkedIn",
      isPrimary: true,
      notes: `Bezpośrednie wyszukiwanie zarządu i osób decyzyjnych na LinkedIn.`,
    });
  }

  // ── 5. Save to database ───────────────────────────────────────────────────
  // First clear older auto-discovered contacts to avoid duplicate spam on re-runs
  await prisma.companyContact.deleteMany({
    where: { companyId },
  });

  const createdContacts = await Promise.all(
    discovered.map((c) =>
      prisma.companyContact.create({
        data: {
          companyId,
          name: c.name,
          role: c.role,
          department: c.department,
          email: c.email,
          phone: c.phone,
          linkedinUrl: c.linkedinUrl,
          source: c.source,
          sourceUrl: c.sourceUrl,
          isPrimary: c.isPrimary || false,
          notes: c.notes,
        },
      })
    )
  );

  return createdContacts;
}

/**
 * Discovers contacts for all companies in a given search
 */
export async function discoverContactsForAllCompaniesInSearch(
  searchId: string
): Promise<{ totalCompanies: number; contactsFound: number }> {
  const companies = await prisma.company.findMany({
    where: { searchId },
    select: { id: true, name: true },
  });

  let totalContacts = 0;

  for (const c of companies) {
    try {
      const contacts = await discoverCompanyContacts(c.id);
      totalContacts += contacts.length;
    } catch (err) {
      console.error(`Error discovering contacts for company ${c.name}:`, err);
    }
  }

  return {
    totalCompanies: companies.length,
    contactsFound: totalContacts,
  };
}

/**
 * ── Google Sheets Export Formatter ───────────────────────────────────────────
 * Generates rows matching the user's exact specification:
 * 
 * ┌──────────────────────┐
 * │     GOOGLE SHEETS    │
 * │                      │
 * │ Firma                │
 * │ Kontakt              │
 * │ Stanowisko           │
 * │ Email                │
 * │ LinkedIn             │
 * │ Score                │
 * │ Punkt zaczepienia    │
 * │ Źródło                │
 * └──────────────────────┘
 */
export interface GoogleSheetsRow {
  firma: string;
  kontakt: string;
  stanowisko: string;
  email: string;
  linkedIn: string;
  score: string;
  punktZaczepienia: string;
  zrodlo: string;
}

export function formatCompanyForGoogleSheets(company: any): GoogleSheetsRow[] {
  const contacts = Array.isArray(company.contacts) && company.contacts.length > 0
    ? company.contacts
    : [
        {
          name: "Do ustalenia (Zarząd)",
          role: "CEO / Właściciel",
          email: company.email || "",
          linkedinUrl: buildLinkedInSearchUrl(company.name),
          source: "BizRaport",
          sourceUrl: "",
        },
      ];

  const primaryHook = company.primaryHook || (company.triggers?.[0]?.hookSuggestion) || "Brak punktu zaczepienia";
  const source = company.triggers?.[0]?.sourceUrl || company.website || (company.krs ? `KRS: ${company.krs}` : "BizRaport");

  return contacts.map((contact: any) => ({
    firma: company.name || "",
    kontakt: contact.name || "",
    stanowisko: contact.role || "",
    email: contact.email || "",
    linkedIn: contact.linkedinUrl || "",
    score: company.score !== null && company.score !== undefined ? String(company.score) : "50",
    punktZaczepienia: primaryHook,
    zrodlo: contact.sourceUrl || source,
  }));
}

/**
 * Format rows as RFC-4180 CSV with UTF-8 BOM for perfect Excel/Google Sheets opening
 */
export function generateGoogleSheetsCsv(rows: GoogleSheetsRow[]): string {
  const headers = [
    "Firma",
    "Kontakt",
    "Stanowisko",
    "Email",
    "LinkedIn",
    "Score",
    "Punkt zaczepienia",
    "Źródło",
  ];

  function escapeCsvValue(val: string): string {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  const csvRows = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((r) =>
      [
        escapeCsvValue(r.firma),
        escapeCsvValue(r.kontakt),
        escapeCsvValue(r.stanowisko),
        escapeCsvValue(r.email),
        escapeCsvValue(r.linkedIn),
        escapeCsvValue(r.score),
        escapeCsvValue(r.punktZaczepienia),
        escapeCsvValue(r.zrodlo),
      ].join(",")
    ),
  ];

  // \uFEFF is the UTF-8 Byte Order Mark (BOM) ensuring Polish diacritics
  // like ą, ć, ę, ł, ń, ó, ś, ź, ż display flawlessly in Excel & Sheets
  return "\uFEFF" + csvRows.join("\r\n");
}

/**
 * Format rows as TSV (Tab-Separated Values) for immediate 1-click clipboard paste
 * into an open Google Sheet (Ctrl+V)
 */
export function generateGoogleSheetsTsv(rows: GoogleSheetsRow[]): string {
  const headers = [
    "Firma",
    "Kontakt",
    "Stanowisko",
    "Email",
    "LinkedIn",
    "Score",
    "Punkt zaczepienia",
    "Źródło",
  ];

  function cleanTsvValue(val: string): string {
    if (!val) return "";
    return String(val).replace(/[\t\r\n]+/g, " ").trim();
  }

  const lines = [
    headers.join("\t"),
    ...rows.map((r) =>
      [
        cleanTsvValue(r.firma),
        cleanTsvValue(r.kontakt),
        cleanTsvValue(r.stanowisko),
        cleanTsvValue(r.email),
        cleanTsvValue(r.linkedIn),
        cleanTsvValue(r.score),
        cleanTsvValue(r.punktZaczepienia),
        cleanTsvValue(r.zrodlo),
      ].join("\t")
    ),
  ];

  return lines.join("\n");
}
