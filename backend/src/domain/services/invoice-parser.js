const LABELED_INVOICE_PATTERNS = [
  /(?:factura|fra\.?)\s*(?:n[º°o]\.?)?\s*[:\-]?\s*([a-z0-9][a-z0-9\-/.]{2,})/i,
  /n[º°o]\.?\s*(?:de\s*)?factura\s*[:\-]?\s*([a-z0-9][a-z0-9\-/.]{2,})/i,
  /(?:n[uú]mero|num\.?|n[º°]\.?)\s*[:\-]?\s*([a-z0-9][a-z0-9\-/.]{2,})/i,
];

const TOTAL_KEYWORDS = /total\s+a\s+pagar|total\s+factura|importe\s+total|total\s+general|total\s+neto|total\s+a\s+abonar|\btotal\b|\bimporte\b/i;
const EXCLUDE_KEYWORDS = /subtotal|base\s+imponible|impuesto|\biva\b|retenci|sin\s+iva|bruto|descuento|recargo/i;

const PERIOD_MONTH = /ener|febr|marz|abri|may|jun|jul|agos|sept|octu|novi|dici|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i;

export function parseInvoiceText(text) {
  if (!text) return { invoiceNumber: null, amount: null, period: null, date: null, baseAmount: null, vatAmount: null, vatRate: null, withholdingAmount: null, withholdingRate: null, holder: null };
  return {
    invoiceNumber: extractInvoiceNumber(text),
    amount: extractTotalAmount(text),
    period: extractPeriod(text),
    date: extractDate(text),
    baseAmount: extractBaseAmount(text),
    vatAmount: extractVatAmount(text),
    vatRate: extractVatRate(text),
    withholdingAmount: extractWithholdingAmount(text),
    withholdingRate: extractWithholdingRate(text),
    holder: extractHolder(text),
  };
}

export function extractInvoiceNumber(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  for (const pattern of LABELED_INVOICE_PATTERNS) {
    const match = cleaned.match(pattern);
    const candidate = match?.[1]?.replace(/[-/.]+$/, '');
    if (candidate && looksLikeInvoiceNumber(candidate)) return candidate;
  }

  return findBareInvoiceNumber(cleaned);
}

function looksLikeInvoiceNumber(value) {
  if (!/[0-9]/.test(value) || value.length < 3) return false;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(value)) return false; // fecha dd/mm/yyyy
  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(value)) return false; // fecha yyyy/mm/dd
  return true;
}

function findBareInvoiceNumber(text) {
  const words = text.match(/[A-Za-z0-9][A-Za-z0-9\-/]*/g) || [];
  const candidates = words.filter(isBareCandidate);
  if (candidates.length === 0) return null;

  const seen = new Set();
  const unique = candidates.filter((w) => (seen.has(w) ? false : (seen.add(w), true)));
  unique.sort((a, b) => scoreInvoiceToken(b) - scoreInvoiceToken(a));
  return unique[0];
}

function isBareCandidate(word) {
  if (word.length < 6 || word.length > 30) return false;
  if (!/[0-9]/.test(word) || !/[A-Za-z]/.test(word)) return false;
  if (/^\d{7,8}[A-Za-z]$/.test(word)) return false; // DNI
  if (/^[A-Za-z]-?\d{8}$/.test(word)) return false; // CIF
  if ((word.match(/-/g) || []).length > 2) return false; // referencia compuesta
  return true;
}

function scoreInvoiceToken(word) {
  const digits = (word.match(/[0-9]/g) || []).length;
  const letters = (word.match(/[A-Za-z]/g) || []).length;
  const seps = (word.match(/[-/]/g) || []).length;
  return digits * 100 + letters * 2 - seps * 50;
}

export function extractTotalAmount(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const priorities = [
    /total\s+a\s+pagar/i,
    /total\s+factura/i,
    /importe\s+total/i,
    /total\s+general/i,
    /total\s+neto/i,
    /\btotal\b/i,
    /\bimporte\b/i,
  ];

  for (const label of priorities) {
    const line = lines.find((l) => label.test(l) && !EXCLUDE_KEYWORDS.test(l));
    if (line) {
      const amounts = amountsIn(line);
      if (amounts.length > 0) return amounts[amounts.length - 1];
    }
  }

  const all = amountsIn(text);
  if (all.length > 0) return Math.max(...all);
  return null;
}

export function extractPeriod(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  const labeled = cleaned.match(/(?:periodo|período|facturacion|facturación|facturado)\s*(?:facturado|de\s*facturacion|de\s*facturación|de\s*consumo|del\s*periodo)?\s*[:\-]?\s*([^•\n]+)/i);
  if (labeled?.[1]) {
    return cleanPeriod(labeled[1]);
  }

  const paren = cleaned.match(/\(([^()]*(?:ener|febr|marz|abri|may|jun|jul|agos|sept|octu|novi|dici|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[^()]*)\)/i);
  if (paren?.[1]) return paren[1].trim().slice(0, 40);

  const ranged = cleaned.match(/\b\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}\s*[-–]\s*\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}\b/);
  if (ranged?.[0]) return ranged[0].slice(0, 40);

  const delAl = cleaned.match(/\b(?:del|desde)\s+(\d{1,2}\s*(?:\/|-)\s*\d{1,2}\s*(?:\/|-)\s*\d{2,4}|\d{1,2}\s+de\s+\w+(?:\s+de\s+\d{4})?)\s+(?:al|hasta)\s+(.+?)(?=\s+(?:total|importe|factura|n[uú]mero|iva\b|base\b|retenci)|\s*$)/i);
  if (delAl?.[0]) return delAl[0].trim().slice(0, 40);

  return null;
}

function cleanPeriod(raw) {
  let value = raw.trim().replace(/[.;,]+$/, '');
  const cutoff = value.search(/\s+(?:total|importe|factura|telf|tel[eé]fono|n[uú]mero)\b/i);
  if (cutoff > 0) value = value.slice(0, cutoff);
  return value ? value.slice(0, 40) : null;
}

const MONTH_NAMES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};

export function extractDate(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // "04 de Enero de 2025" / "4 Enero 2025"
  const named = cleaned.match(
    /(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+(?:de\s+)?(\d{4})/i,
  );
  if (named) {
    const month = MONTH_NAMES[named[2].toLowerCase()];
    if (month) return toIsoDate(Number(named[1]), month, Number(named[3]));
  }

  // "DD/MM/YYYY" o "DD-MM-YYYY"
  const numeric = cleaned.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = Number(numeric[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return toIsoDate(day, month, year);
    }
  }

  return null;
}

function toIsoDate(day, month, year) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extractBaseAmount(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const patterns = [
    /base\s+imponible/i,
    /importe\s+base/i,
    /total\s+sin\s+iva/i,
    /total\s+sin\s+impuestos/i,
    /importe\s+neto/i,
    /subtotal/i,
  ];
  for (const pattern of patterns) {
    const line = lines.find((l) => pattern.test(l));
    if (line) {
      const amounts = amountsIn(line);
      if (amounts.length > 0) return amounts[0];
    }
  }
  return null;
}

export function extractVatAmount(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!/iva/i.test(line) || /incluido|sin\s*iva/i.test(line)) continue;
    const amounts = amountsIn(line);
    if (amounts.length > 0) return amounts[amounts.length - 1];
  }
  const impuestos = lines.find((l) => /impuestos/i.test(l));
  if (impuestos) {
    const amounts = amountsIn(impuestos);
    if (amounts.length > 0) return amounts[amounts.length - 1];
  }
  return null;
}

export function extractVatRate(text) {
  const match = text.match(/iva\s*\(?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i);
  if (match) {
    const n = Number(match[1].replace(',', '.'));
    if (n >= 0 && n <= 100) return n / 100;
  }
  return null;
}

export function extractWithholdingAmount(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const line = lines.find((l) => /retenci|irpf/i.test(l));
  if (!line) return null;
  const amounts = amountsIn(line);
  if (amounts.length > 0) return Math.abs(amounts[amounts.length - 1]);
  return null;
}

export function extractWithholdingRate(text) {
  const match = text.match(/(?:retenci[oó]n|irpf)[^\d]{0,15}?(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i);
  if (match) {
    const n = Number(match[1].replace(',', '.'));
    if (n >= 0 && n <= 100) return n / 100;
  }
  return null;
}

export function extractHolder(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const line = lines.find((l) => /titular/i.test(l));
  if (!line) return null;
  const value = line.replace(/^titular\s*[:\-]?\s*/i, '').trim();
  if (!value) return null;
  return value.replace(/\s*(?:CIF|NIF|DNI|N\.?I\.?F\.?)[:\-]?\s*.*$/i, '').slice(0, 80);
}

function amountsIn(str) {
  const tagged = [...str.matchAll(/([\d.,]+)\s*(?:€|EUR|euros?)/gi)]
    .map((m) => parseMoney(m[1]))
    .filter((n) => Number.isFinite(n));
  if (tagged.length > 0) return tagged;

  return [...str.matchAll(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\b/g)]
    .map((m) => parseMoney(m[0]))
    .filter((n) => Number.isFinite(n));
}

function parseMoney(raw) {
  let s = raw.trim().replace(/\s|€/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}
