/**
 * Detects if a string contains Gujarati unicode characters
 */
export function containsGujarati(text: string): boolean {
  return /[\u0A80-\u0AFF]/.test(text);
}

/**
 * Translates text between English and Gujarati using Google's translation service
 */
export async function translateText(
  text: string,
  targetLang: "gu" | "en"
): Promise<string> {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";

  const isGu = containsGujarati(trimmed);
  if (targetLang === "gu" && isGu) return trimmed;
  if (targetLang === "en" && !isGu) return trimmed;

  const srcLang = isGu ? "gu" : "en";

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((c: any) => c[0])
          .join("")
          .trim();
        if (translated) return translated;
      }
    }
  } catch (err) {
    console.warn(`[Translate] Error translating "${trimmed}":`, err);
  }

  return trimmed;
}

/**
 * Ensures both English and Gujarati versions of a field are populated.
 * If only one is provided, automatically translates the other.
 */
export async function autoTranslatePair(
  inputEn?: string,
  inputGu?: string
): Promise<{ en: string; gu: string }> {
  const en = (inputEn || "").trim();
  const gu = (inputGu || "").trim();

  // If user provided both distinct values, retain them as-is
  if (en && gu && en !== gu) {
    return { en, gu };
  }

  const base = en || gu;
  if (!base) return { en: "", gu: "" };

  const isGu = containsGujarati(base);
  if (isGu) {
    const translatedEn = await translateText(base, "en");
    return { en: translatedEn || base, gu: base };
  } else {
    const translatedGu = await translateText(base, "gu");
    return { en: base, gu: translatedGu || base };
  }
}
