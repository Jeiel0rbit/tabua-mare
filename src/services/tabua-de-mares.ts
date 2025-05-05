/**
 * @fileOverview Service function for interacting with tabuademares.com.
 * Includes function to fetch detailed daily tide data for a city.
 */

import { JSDOM } from 'jsdom'; // Using jsdom for server-side DOM parsing

/**
 * Represents a single tide event (high or low).
 */
export interface TideEvent {
  /** The time of the tide (HH:MM). */
  time: string;
  /** The height of the tide in meters (e.g., "3.2"). */
  height: string;
}

/**
 * Represents the detailed tide and related information for a single day.
 */
export interface DailyTideInfo {
  /** The day of the month (e.g., 1). */
  dayOfMonth: number;
  /** The abbreviation for the day of the week (e.g., "Qui"). */
  dayOfWeek: string;
  /** The URL source for the moon phase icon. */
  moonPhaseIconSrc: string | null;
  /** Sunrise time (HH:MM). */
  sunriseTime: string | null;
  /** Sunset time (HH:MM). */
  sunsetTime: string | null;
  /** First tide event of the day. */
  tide1: TideEvent | null;
  /** Second tide event of the day. */
  tide2: TideEvent | null;
  /** Third tide event of the day. */
  tide3: TideEvent | null;
  /** Fourth tide event of the day. */
  tide4: TideEvent | null;
  /** Tide coefficient text (e.g., "68médio"). */
  coefficient: string | null;
}

/**
 * Represents the complete data scraped from the page, including daily tides and context.
 */
export interface ScrapedPageData {
  /** An array of detailed tide information for each day found. */
  dailyTides: DailyTideInfo[];
  /** Context text scraped from a specific element after a delay (e.g., activity level/summary). */
  pageContextText: string | null;
   /** The main location header text (e.g., "Tábua de marés de Ananindeua"). */
  locationHeader: string | null;
}


const BASE_URL = "https://tabuademares.com";

/**
 * Normalizes a string for use in a URL slug.
 * Converts to lowercase, removes accents, replaces spaces with hyphens.
 * @param input The string to normalize.
 * @returns The normalized string slug.
 */
function normalizeToSlug(input: string): string {
    if (!input) return "";
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars except space and hyphen
        .trim()
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
}


/**
 * Fetches HTML content from a given URL.
 * @param url The URL to fetch.
 * @returns A promise resolving to the HTML text content.
 * @throws If the fetch request fails or returns a non-OK status.
 */
async function fetchHtml(url: string): Promise<string> {
  console.log(`[Service] Fetching HTML from: ${url}`);
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.error(`[Service] HTTP error! status: ${response.status} for URL: ${url}`);
      throw new Error(`HTTP error ${response.status} fetching ${url}`);
    }
    const html = await response.text();
    console.log(`[Service] Successfully fetched HTML from: ${url}`);
    return html;
  } catch (error) {
    console.error(`[Service] Network or fetch error for ${url}:`, error);
    throw new Error(`Failed to fetch HTML from ${url}. Reason: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to extract tide event data from a table cell.
 * @param cell The TD element potentially containing tide data.
 * @returns A TideEvent object or null if data is not found or invalid.
 */
function extractTideEvent(cell: Element | null | undefined): TideEvent | null {
    if (!cell) return null;

    const timeEl = cell.querySelector('.tabla_mareas_marea_hora');
    const heightEl = cell.querySelector('.tabla_mareas_marea_altura_numero');

    const time = timeEl?.textContent?.trim();
    // Ensure height is a valid number format before replacing comma
    const heightText = heightEl?.textContent?.trim();
    const height = heightText && /^[0-9,.]+$/.test(heightText) ? heightText.replace(',', '.') : null;


    if (time && height) {
        // Basic time format validation (HH:MM)
        if (!/^\d{1,2}:\d{2}$/.test(time)) {
             console.warn(`[Service] Invalid time format extracted: '${time}'`);
             return null;
        }
        return { time, height };
    }
    return null;
}


/**
 * Asynchronously retrieves detailed daily tide data for a given state and city by scraping tabuademares.com.
 * Scrapes the main tide table and additional context text.
 * Handles the special 'so-paulo' slug for São Paulo state.
 * @param stateSlug The URL slug of the state (e.g., "para", "rio-de-janeiro", "so-paulo").
 * @param citySlug The URL slug of the city, normalized from user input (e.g., "belem", "santos", "sao-vicente").
 * @returns A promise that resolves to a ScrapedPageData object containing daily info and context, or null if a critical error occurs.
 * @throws If fetching the HTML fails critically.
 */
export async function getTideData(stateSlug: string, citySlug: string): Promise<ScrapedPageData | null> {
  if (!stateSlug || !citySlug) {
     console.warn("[Service] getTideData called with empty stateSlug or citySlug.");
     return null;
  }

  const url = `${BASE_URL}/br/${stateSlug}/${citySlug}`;
  console.log(`[Service] Requesting tide data from URL: ${url}`);

  try {
    const html = await fetchHtml(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // --- First Scrape: Main Tide Table ---
    // Updated selector based on user request (derived from XPath)
    const tideTableSelector = 'body > section > div:nth-child(4) > div > div:nth-child(1) > div:nth-child(4) > div:nth-child(1) > table';
    const tideTable = document.querySelector(tideTableSelector);
    const dailyTides: DailyTideInfo[] = [];
    const locationHeader = document.querySelector('h1')?.textContent?.trim() ?? null; // Scrape H1 header

    if (!tideTable) {
      console.warn(`[Service] Tide table ('${tideTableSelector}') not found on ${url}. Assuming invalid city/state or page structure change.`);
      // Return structure indicating no table found, but include header if possible
      return { dailyTides: [], pageContextText: null, locationHeader };
    }

    // Find the tbody within the selected table
    const tableBody = tideTable.querySelector('tbody');
    if (!tableBody) {
        console.warn(`[Service] Found table ('${tideTableSelector}') but it has no tbody element on ${url}.`);
        return { dailyTides: [], pageContextText: null, locationHeader };
    }

    // Get all rows, filter out header/metadata rows based on class or structure if needed
    // The provided HTML has data rows with class like 'tabla_mareas_fila_fondo2' or 'tabla_mareas_fila_fondo1'
    // And sometimes a second row per day like 'tabla_mareas_fila_fondo2_2' which we skip.
    const rows = tableBody.querySelectorAll('tr[class^="tabla_mareas_fila tabla_mareas_fila_fondo"]');
    if (rows.length === 0) {
        console.warn(`[Service] Found table tbody but it has no data rows matching selector 'tr[class^="tabla_mareas_fila tabla_mareas_fila_fondo"]' on ${url}.`);
         // Return structure indicating empty table, but include header if possible
        return { dailyTides: [], pageContextText: null, locationHeader };
    }

    rows.forEach((row, index) => {
      // Skip the secondary rows (like tabla_mareas_fila_fondo2_2)
      if (row.classList.contains('tabla_mareas_fila_fondo1_2') || row.classList.contains('tabla_mareas_fila_fondo2_2') || row.classList.contains('tabla_mareas_fila_fondo3_22_2')) {
          // console.log(`[Service] Skipping row ${index + 1} as it's a secondary info row.`);
          return;
      }

      const cells = row.querySelectorAll('td');
      // Expecting 8 cells in the main data row (day, moon, sun, tide1, tide2, tide3, tide4, coefficient)
      // Note: The 'Atividade Média' cell is also present but we use the coefficient cell (index 7)
      if (cells.length < 8) {
          console.warn(`[Service] Skipping data row ${index + 1} due to insufficient cells (${cells.length}). Expected at least 8. Row HTML:`, row.innerHTML);
          return; // Skip this row
      }

      // Extract data using specific selectors within cells
      const dayOfMonthStr = cells[0]?.querySelector('.tabla_mareas_dia_numero')?.textContent?.trim();
      const dayOfMonth = dayOfMonthStr ? parseInt(dayOfMonthStr, 10) : NaN;
      const dayOfWeek = cells[0]?.querySelector('.tabla_mareas_dia_dia')?.textContent?.trim() ?? '';

      // Handle Moon phase - prefer image, fallback might be needed if site changes
      const moonPhaseImg = cells[1]?.querySelector('img');
      let moonPhaseIconSrc = moonPhaseImg?.getAttribute('src') ?? null;
      // If src is relative, make it absolute
      if (moonPhaseIconSrc && !moonPhaseIconSrc.startsWith('http')) {
          moonPhaseIconSrc = `${BASE_URL}${moonPhaseIconSrc}`;
      }
       // Fallback: Check for span class if image not found (less reliable)
      if (!moonPhaseIconSrc) {
          const moonSpan = cells[1]?.querySelector('span[class*="icon-hs"]'); // Look for spans with icon classes
          if (moonSpan) {
              // Cannot reliably get an image SRC from this, maybe log the class?
              console.warn(`[Service] Moon phase image not found for day ${dayOfMonthStr}, found span class: ${moonSpan.className}`);
              // Set to null or a placeholder if needed
              moonPhaseIconSrc = null; // Or some default placeholder?
          }
      }


      // Sunrise/Sunset - Extract text, ignore potential icon spans
      const sunriseTimeRaw = cells[2]?.querySelector('.tabla_mareas_salida_puesta_sol_salida')?.textContent?.trim();
      const sunsetTimeRaw = cells[2]?.querySelector('.tabla_mareas_salida_puesta_sol_puesta')?.textContent?.trim();
      const sunriseTime = sunriseTimeRaw ? sunriseTimeRaw.match(/\d{1,2}:\d{2}/)?.[0] ?? null : null;
      const sunsetTime = sunsetTimeRaw ? sunsetTimeRaw.match(/\d{1,2}:\d{2}/)?.[0] ?? null : null;


      // Parse tides using helper function and specific cell indices
      const tide1 = extractTideEvent(cells[3]);
      const tide2 = extractTideEvent(cells[4]);
      const tide3 = extractTideEvent(cells[5]);
      const tide4 = extractTideEvent(cells[6]);

      // Coefficient - grab all text content, clean it up
      const coefficientEl = cells[7]?.querySelector('.tabla_mareas_coeficiente_numero');
      let coefficient = coefficientEl?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
      // Remove the 'altura' part if present e.g., "68 médio" -> "68 médio" (or just "68" if needed)
      // Current implementation keeps the description ("médio", "baixo", etc.)


      if (!isNaN(dayOfMonth)) {
          dailyTides.push({
              dayOfMonth,
              dayOfWeek,
              moonPhaseIconSrc, // Already absolute or null
              sunriseTime,
              sunsetTime,
              tide1,
              tide2,
              tide3,
              tide4,
              coefficient,
          });
      } else {
          console.warn(`[Service] Skipping data row ${index + 1} due to failed day parsing. DayOfMonthStr='${dayOfMonthStr}'. Row HTML:`, row.innerHTML);
      }
    });

    // --- Second Scrape: Context Text ---
    // Using specific selector provided by user
    const contextElementSelector = '#noprint1 > div:nth-child(18) > div:nth-child(3)';
    const contextElement = document.querySelector(contextElementSelector);
    const pageContextText = contextElement?.textContent?.trim() ?? null;

    if (!pageContextText) {
        console.warn(`[Service] Context text element ('${contextElementSelector}') not found or empty on ${url}.`);
    }

    console.log(`[Service] Extracted ${dailyTides.length} daily tide entries. Context: '${pageContextText}' for ${citySlug}, ${stateSlug}.`);

    return { dailyTides, pageContextText, locationHeader };

  } catch (error) {
    console.error(`[Service] Error processing or parsing HTML for ${citySlug}, ${stateSlug} from ${url}:`, error);
    return null; // Return null for critical errors
  }
}

// Export the normalization function if needed elsewhere
export { normalizeToSlug };
// Ensure jsdom is installed: npm install jsdom @types/jsdom
