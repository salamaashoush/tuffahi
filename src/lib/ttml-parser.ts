/**
 * TTML (Timed Text Markup Language) parser for Apple Music lyrics
 * Parses TTML XML into structured lyric lines with timing information
 */

export interface LyricSyllable {
  text: string;
  startTime: number;
  endTime: number;
}

export interface LyricLine {
  text: string;
  startTime: number;
  endTime: number;
  syllables: LyricSyllable[];
}

/**
 * Parse a TTML time string (e.g., "00:01:23.456" or "83.456s") to seconds
 */
function parseTime(timeStr: string): number {
  if (!timeStr) return 0;

  // Format: "123.456s"
  if (timeStr.endsWith('s')) {
    return parseFloat(timeStr.slice(0, -1)) || 0;
  }

  // Format: "HH:MM:SS.mmm" or "MM:SS.mmm"
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseFloat(s) || 0);
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return (parseInt(m) || 0) * 60 + (parseFloat(s) || 0);
  }

  return parseFloat(timeStr) || 0;
}

/**
 * Parse TTML XML string into an array of LyricLine objects
 */
export function parseTTML(ttml: string): LyricLine[] {
  if (!ttml) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(ttml, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.warn('[TTML] Parse error:', parseError.textContent);
      return [];
    }

    const lines: LyricLine[] = [];

    // Find all <p> elements (each represents a lyric line)
    const paragraphs = doc.querySelectorAll('p');

    for (const p of paragraphs) {
      const begin = p.getAttribute('begin');
      const end = p.getAttribute('end');
      if (!begin) continue;

      const startTime = parseTime(begin);
      const endTime = end ? parseTime(end) : startTime + 5; // Default 5s duration

      // Parse syllables from <span> children
      const syllables: LyricSyllable[] = [];
      const spans = p.querySelectorAll('span');

      if (spans.length > 0) {
        for (const span of spans) {
          const spanBegin = span.getAttribute('begin');
          const spanEnd = span.getAttribute('end');
          const text = span.textContent?.trim() || '';
          if (!text) continue;

          syllables.push({
            text,
            startTime: spanBegin ? parseTime(spanBegin) : startTime,
            endTime: spanEnd ? parseTime(spanEnd) : endTime,
          });
        }
      }

      // Get full text from the paragraph
      const text = p.textContent?.trim() || '';
      if (!text) continue;

      lines.push({
        text,
        startTime,
        endTime,
        syllables,
      });
    }

    return lines;
  } catch (err) {
    console.error('[TTML] Failed to parse:', err);
    return [];
  }
}

/**
 * Binary search for the current lyric line based on playback time
 * Returns the index of the active line, or -1 if none
 */
export function findCurrentLine(lines: LyricLine[], time: number): number {
  if (lines.length === 0) return -1;

  let low = 0;
  let high = lines.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].startTime <= time) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Verify the found line is still active (not past its end time)
  if (result >= 0 && lines[result].endTime < time) {
    return -1;
  }

  return result;
}
