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
 * Parses a combined time and height string (e.g., "0:49\n3,2 m") into a TideEvent object.
 * @param text The text content to parse.
 * @returns A TideEvent object or null if parsing fails.
 */
function parseTideCell(text: string | null | undefined): TideEvent | null {
    if (!text) return null;
    const parts = text.trim().split('\n');
    if (parts.length < 2) return null;

    const time = parts[0]?.trim();
    const heightMatch = parts[1]?.trim().match(/([\d.,]+)/);
    const height = heightMatch ? heightMatch[1].replace(',', '.') : null;

    if (time && height) {
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

    const rows = tableBody.querySelectorAll('tr');
    if (rows.length === 0) {
        console.warn(`[Service] Found table tbody but it has no data rows (tr) on ${url}.`);
         // Return structure indicating empty table, but include header if possible
        return { dailyTides: [], pageContextText: null, locationHeader };
    }

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 8) { // Need at least 8 cells for all the data points
          console.warn(`[Service] Skipping row ${index + 1} due to insufficient cells (${cells.length}). Expected 8+. Row HTML:`, row.innerHTML);
          return; // Skip this row
      }

      // Extract data from cells
      const dayText = cells[0]?.textContent?.trim(); // "1Qui"
      const dayMatch = dayText?.match(/(\d+)(\D+)/);
      const dayOfMonth = dayMatch ? parseInt(dayMatch[1], 10) : NaN;
      const dayOfWeek = dayMatch ? dayMatch[2] : '';

      const moonPhaseIconSrc = cells[1]?.querySelector('img')?.getAttribute('src') ?? null;

      // Sunrise/Sunset might be complex, look for times within the cell
      const sunTimesText = cells[2]?.textContent?.trim(); // "6:08\n18:13"
      const sunTimes = sunTimesText?.split('\n').map(t => t.trim());
      const sunriseTime = sunTimes?.[0] ?? null;
      const sunsetTime = sunTimes?.[1] ?? null;

      // Parse tides - indices might need adjustment based on actual HTML structure
      const tide1 = parseTideCell(cells[3]?.textContent);
      const tide2 = parseTideCell(cells[4]?.textContent);
      const tide3 = parseTideCell(cells[5]?.textContent);
      const tide4 = parseTideCell(cells[6]?.textContent);
      const coefficient = cells[7]?.textContent?.trim() ?? null;

      if (!isNaN(dayOfMonth)) {
          dailyTides.push({
              dayOfMonth,
              dayOfWeek,
              moonPhaseIconSrc: moonPhaseIconSrc ? `${BASE_URL}${moonPhaseIconSrc}` : null, // Prepend base URL if relative
              sunriseTime,
              sunsetTime,
              tide1,
              tide2,
              tide3,
              tide4,
              coefficient,
          });
      } else {
          console.warn(`[Service] Skipping row ${index + 1} due to failed day parsing. DayText='${dayText}'. Row HTML:`, row.innerHTML);
      }
    });

    // --- Second Scrape: Context Text (after simulated delay) ---
    // No actual delay needed server-side as we have the full DOM
    const contextElementSelector = '#noprint1 > div:nth-child(18) > div:nth-child(3)'; // Using specific selector
    const contextElement = document.querySelector(contextElementSelector);
    const pageContextText = contextElement?.textContent?.trim() ?? null;

    if (!pageContextText) {
        console.warn(`[Service] Context text element ('${contextElementSelector}') not found or empty on ${url}.`);
    }

    console.log(`[Service] Extracted ${dailyTides.length} daily tide entries and context: '${pageContextText}' for ${citySlug}, ${stateSlug}.`);

    return { dailyTides, pageContextText, locationHeader };

  } catch (error) {
    console.error(`[Service] Error processing or parsing HTML for ${citySlug}, ${stateSlug} from ${url}:`, error);
    return null; // Return null for critical errors
  }
}

// Export the normalization function if needed elsewhere
export { normalizeToSlug };
// Ensure jsdom is installed: npm install jsdom @types/jsdom
