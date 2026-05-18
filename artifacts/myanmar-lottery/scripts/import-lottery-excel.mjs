import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";

const MM_DIGITS = "၀၁၂၃၄၅၆၇၈၉";
const EN_DIGITS = "0123456789";

function mmToEn(input) {
  return String(input).replace(/[၀-၉]/g, (ch) => EN_DIGITS[MM_DIGITS.indexOf(ch)] ?? ch);
}

function parseMatchLength(note, fallback) {
  if (!note) return fallback;
  const raw = mmToEn(String(note));
  const m = raw.match(/ရှေ့ဂဏန်း\((\d)\)လုံး/);
  if (!m) return fallback;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : fallback;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const inputPath = process.argv[2] ?? path.join(repoRoot, "assets", "Myanmar_Lottery86_2026.xlsx");
  const filename = path.basename(inputPath);
  const drawMatch = filename.match(/Lottery(\d+)/i);
  const detectedDraw = drawMatch ? Number(drawMatch[1]) : 86;
  const drawNumber = Number(process.argv[3] ?? detectedDraw);
  const drawDate = process.argv[4] ?? "2026-05-01";
  const outputPath = process.argv[5] ?? path.join(
    repoRoot,
    "artifacts",
    "myanmar-lottery",
    "assets",
    "data",
    `draw-${drawNumber}.json`,
  );
  const templatePath = path.join(
    repoRoot,
    "assets",
    "Lottery_Draw_Template.xlsx",
  );

  const wb = xlsx.readFile(inputPath);
  const firstSheetName = wb.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[firstSheetName], { defval: "" });

  const entries = [];
  for (const [idx, row] of rows.entries()) {
    const prizeCategory = String(row["ဆုအမျိုးအစား"] ?? "").trim();
    const alpha = String(row["အက္ခရာ"] ?? "").trim();
    const rawNumber = row["ထီနံပါတ်"];
    const winners = String(row["ကံထူးရှင်အရေအတွက်"] ?? "").trim();
    const note = String(row["မှတ်ချက်"] ?? "").trim();

    if (!prizeCategory || !alpha || rawNumber === "") continue;

    const compact = mmToEn(String(rawNumber)).replace(/[^0-9]/g, "");
    const guessedLen = compact.length;
    const matchLength = parseMatchLength(note, guessedLen);
    const pattern = compact.padStart(matchLength, "0");

    entries.push({
      id: `r${idx + 2}`,
      prizeCategory,
      alpha,
      pattern,
      matchLength,
      winners,
      note,
      rank: idx,
    });
  }

  const byCategory = new Map();
  for (const e of entries) {
    if (!byCategory.has(e.prizeCategory)) byCategory.set(e.prizeCategory, []);
    byCategory.get(e.prizeCategory).push(`${e.alpha}-${e.pattern}`);
  }

  const data = {
    drawNumber,
    drawDate,
    sourceName: `Myanmar Lottery ${drawNumber} (Excel)`,
    sourceUrl: `assets/${path.basename(inputPath)}`,
    verifiedAt: new Date().toISOString(),
    prizes: Array.from(byCategory.entries()).map(([amount, numbers]) => ({
      amount,
      numbers,
    })),
    entries,
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");

  const templateRows = [
    ["ဆုအမျိုးအစား", "အက္ခရာ", "ထီနံပါတ်", "ကံထူးရှင်အရေအတွက်", "မှတ်ချက်"],
    ["ကျပ်သိန်း (၃၀၀၀) ဆု", "က", "123456", "၁ ဦး", "အက္ခရာနှင့်ရှေ့ဂဏန်း(၆)လုံးတူ"],
    ["ဝေဝေဆာဆာပဒေသာ ကျပ် (၂) သိန်းဆုများ", "ခ", "1234", "၁၀ ယူနစ်", "အက္ခရာနှင့်ရှေ့ဂဏန်း(၄)လုံးတူ"],
  ];
  const twb = xlsx.utils.book_new();
  const tws = xlsx.utils.aoa_to_sheet(templateRows);
  xlsx.utils.book_append_sheet(twb, tws, "draw-template");
  xlsx.writeFile(twb, templatePath);

  console.log(`Imported: ${inputPath}`);
  console.log(`Wrote draw data: ${outputPath}`);
  console.log(`Wrote template: ${templatePath}`);
  console.log(`Draw: ${drawNumber} | Date: ${drawDate}`);
  console.log(`Rows imported: ${entries.length}`);
}

main();
