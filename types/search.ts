// Search Criteria and Filter definitions aligned with BizRaport API

export interface SearchCriteria {
  // Basic & Keywords
  query?: string;             // Słowo kluczowe w nazwie / opisie firmy

  // Branża & PKD
  pkdSection?: string;        // Sekcja PKD (np. 'J' - Informacja i komunikacja)
  pkdDivision?: string;       // Dział PKD (np. '62' - Oprogramowanie)
  pkdCodes?: string[];        // Konkretne kody PKD (np. ['62.01.Z', '62.02.Z'])

  // Lokalizacja
  voivodeships?: string[];    // Wybrane województwa
  city?: string;              // Miasto

  // Finanse (PLN)
  revenueMin?: number;        // Minimalny obrót / przychód
  revenueMax?: number;        // Maksymalny obrót / przychód
  netProfitMin?: number;      // Minimalny zysk netto
  ebitdaMin?: number;         // Minimalna EBITDA

  // Liczba pracowników
  employeesMin?: number;      // Minimalna liczba pracowników
  employeesMax?: number;      // Maksymalna liczba pracowników

  // Wskaźniki wzrostu & Finansowe
  cagrRevenueMin?: number;    // Min CAGR przychodów (wzrost r/r %)

  // Status prawny i wykluczenia ryzyka
  onlyActive?: boolean;       // Tylko spółki nie wykreślone z KRS
  excludeKRZ?: boolean;       // Wyklucz wpisy w Krajowym Rejestrze Zadłużonych
  excludeMSiG?: boolean;      // Wyklucz wpisy upadłościowe MSiG
}

export interface SearchConfig {
  id?: string;
  name: string;
  description?: string;
  status?: "DRAFT" | "RUNNING" | "DONE" | "ERROR";
  criteria: SearchCriteria;
  createdAt?: string;
  updatedAt?: string;
}

export const POLISH_VOIVODESHIPS = [
  "DOLNOŚLĄSKIE",
  "KUJAWSKO-POMORSKIE",
  "LUBELSKIE",
  "LUBUSKIE",
  "ŁÓDZKIE",
  "MAŁOPOLSKIE",
  "MAZOWIECKIE",
  "OPOLSKIE",
  "PODKARPACKIE",
  "PODLASKIE",
  "POMORSKIE",
  "ŚLĄSKIE",
  "ŚWIĘTOKRZYSKIE",
  "WARMIŃSKO-MAZURSKIE",
  "WIELKOPOLSKIE",
  "ZACHODNIOPOMORSKIE",
] as const;

export const PKD_SECTIONS = [
  { code: "A", name: "A - Rolnictwo, leśnictwo, łowiectwo i rybactwo" },
  { code: "B", name: "B - Górnictwo i wydobywanie" },
  { code: "C", name: "C - Przetwórstwo przemysłowe" },
  { code: "D", name: "D - Wytwarzanie i zaopatrywanie w energię elektryczną, gaz..." },
  { code: "E", name: "E - Dostawa wody; gospodarowanie odpadami..." },
  { code: "F", name: "F - Budownictwo" },
  { code: "G", name: "G - Handel hurtowy i detaliczny; naprawa pojazdów" },
  { code: "H", name: "H - Transport i gospodarka magazynowa" },
  { code: "I", name: "I - Zakwaterowanie i usługi gastronomiczne" },
  { code: "J", name: "J - Informacja i komunikacja (IT, Media, Telco)" },
  { code: "K", name: "K - Działalność finansowa i ubezpieczeniowa" },
  { code: "L", name: "L - Obsługa rynku nieruchomości" },
  { code: "M", name: "M - Działalność profesjonalna, naukowa i techniczna" },
  { code: "N", name: "N - Usługi administrowania i działalność wspierająca" },
  { code: "P", name: "P - Edukacja" },
  { code: "Q", name: "Q - Opieka zdrowotna i pomoc społeczna" },
  { code: "R", name: "R - Kultura, rozrywka i rekreacja" },
  { code: "S", name: "S - Pozostała działalność usługowa" },
] as const;

export const POPULAR_PKD_DIVISIONS = [
  { code: "62", section: "J", name: "62 - Oprogramowanie i doradztwo IT" },
  { code: "63", section: "J", name: "63 - Usługi informacyjne i chmurowe" },
  { code: "70", section: "M", name: "70 - Doradztwo związane z zarządzaniem" },
  { code: "71", section: "M", name: "71 - Architektura i inżynieria" },
  { code: "73", section: "M", name: "73 - Reklama, marketing i agencje" },
  { code: "46", section: "G", name: "46 - Handel hurtowy" },
  { code: "47", section: "G", name: "47 - E-commerce / Handel detaliczny" },
  { code: "49", section: "H", name: "49 - Transport lądowy i logistyka" },
  { code: "28", section: "C", name: "28 - Produkcja maszyn i urządzeń" },
  { code: "25", section: "C", name: "25 - Produkcja wyrobów metalowych" },
] as const;
