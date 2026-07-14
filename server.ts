import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { Product, FAQItem, LogEntry, Message } from "./src/types";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Google Sheet URLs
const SPREADSHEET_ID = "1SKdhOx3xt8SHBo5xeJhXdOj48QLN7zkQt_61moUiN7k";
const CATALOG_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=550755725`;
const FAQ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1504177552`;
const LOGS_WRITE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'Логи'!A:E:append?valueInputOption=USER_ENTERED`;

// Local cache
let catalogCache: Product[] | null = null;
let faqCache: FAQItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory logs
const LOCAL_LOGS_FILE = path.join(process.cwd(), "logs_local.json");
let localLogs: LogEntry[] = [];

// Load local logs on startup
try {
  if (fs.existsSync(LOCAL_LOGS_FILE)) {
    const data = fs.readFileSync(LOCAL_LOGS_FILE, "utf-8");
    localLogs = JSON.parse(data);
  }
} catch (error) {
  console.error("Failed to load local logs:", error);
}

// Robust CSV Parser
function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentField = '';
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          insideQuote = false; // End of quoted field
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        row.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        row.push(currentField.trim());
        currentField = '';
        if (row.length > 0 && row.some(cell => cell !== '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || row.length > 0) {
    row.push(currentField.trim());
    if (row.some(cell => cell !== '')) {
      result.push(row);
    }
  }

  return result;
}

// Helper to convert Google Drive sharing links to direct embeddable image URLs
// Also falls back to beautiful high-quality internet coffee/equipment pictures depending on the item name/type/description
function getDirectImageUrl(url: string | undefined, name: string = "", type: string = "", description: string = ""): string {
  const normName = name.toLowerCase();
  const normType = type.toLowerCase();
  const normDesc = description.toLowerCase();

  const getUnsplashFallback = (): string => {
    if (normName.includes("подписк") || normName.includes("абонемент") || normDesc.includes("подписк")) {
      return "https://images.unsplash.com/photo-1508766917616-d22f3f1eea14?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("чашк") || normName.includes("кружк") || normName.includes("cup") || normName.includes("mug")) {
      return "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("темпер") || normName.includes("tamper")) {
      return "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("весы") || normName.includes("scale")) {
      return "https://images.unsplash.com/photo-1594911774802-8822a7079af1?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("фильтр") || normName.includes("filter")) {
      return "https://images.unsplash.com/photo-1580901768403-125902bcfa53?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("турк") || normName.includes("джезв") || normDesc.includes("турк") || normDesc.includes("джезв")) {
      return "https://images.unsplash.com/photo-1579888944880-d98341148733?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("кемекс") || normName.includes("chemex") || normDesc.includes("кемекс") || normDesc.includes("chemex")) {
      return "https://images.unsplash.com/photo-1545665225-b23b99e4d45e?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("ворон") || normName.includes("v60") || normName.includes("пуровер") || normDesc.includes("ворон") || normDesc.includes("v60") || normDesc.includes("пуровер")) {
      return "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("аэропресс") || normName.includes("aeropress") || normDesc.includes("аэропресс") || normDesc.includes("aeropress")) {
      return "https://images.unsplash.com/photo-1517581173977-bc6d14949a46?auto=format&fit=crop&q=80&w=400";
    }
    if (normName.includes("гейзер") || normName.includes("moka") || normDesc.includes("гейзер") || normDesc.includes("moka")) {
      return "https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?auto=format&fit=crop&q=80&w=400";
    }
    if (normType.includes("бленд") || normName.includes("смес") || normName.includes("blend")) {
      return "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=400";
    }
    if (normType.includes("моносорт") || normName.includes("сорт") || normName.includes("кофе") || normDesc.includes("кофе")) {
      return "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=400";
    }
    
    // Generic coffee fallback
    return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400";
  };

  if (!url) return getUnsplashFallback();
  
  // Trim quotes or spaces
  url = url.trim().replace(/^"|"$/g, '').trim();

  if (!url || url.toLowerCase() === "нет" || url.toLowerCase() === "no" || url.toLowerCase() === "none" || url.startsWith("-")) {
    return getUnsplashFallback();
  }

  // Check if it's a Google Drive link
  const driveFileRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = url.match(driveFileRegex);
  if (match1 && match1[1]) {
    return `https://lh3.googleusercontent.com/d/${match1[1]}`;
  }

  const driveOpenRegex = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = url.match(driveOpenRegex);
  if (match2 && match2[1]) {
    return `https://lh3.googleusercontent.com/d/${match2[1]}`;
  }

  const driveUcRegex = /docs\.google\.com\/uc\?(?:export=download&)?id=([a-zA-Z0-9_-]+)/;
  const match3 = url.match(driveUcRegex);
  if (match3 && match3[1]) {
    return `https://lh3.googleusercontent.com/d/${match3[1]}`;
  }

  const driveShortRegex = /drive\.google\.com\/d\/([a-zA-Z0-9_-]+)/;
  const match4 = url.match(driveShortRegex);
  if (match4 && match4[1]) {
    return `https://lh3.googleusercontent.com/d/${match4[1]}`;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return getUnsplashFallback();
  }

  return url;
}

// Fetch and Parse Catalog
async function fetchCatalog(): Promise<Product[]> {
  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csvText = await res.text();
    const rows = parseCSV(csvText);
    
    // Header check: ID, Название, Тип, Описание, Обжарка, Кислотность (1-5), Сладость (1-5), Плотность (1-5), Ноты вкуса, Способы заваривания, Цена (руб), Ссылка на фото
    const headers = rows[0]?.map(h => h.toLowerCase()) || [];
    const idIdx = headers.indexOf("id");
    const nameIdx = headers.indexOf("название");
    const typeIdx = headers.indexOf("тип");
    const descIdx = headers.indexOf("описание");
    const roastIdx = headers.indexOf("обжарка");
    const acidIdx = headers.indexOf("кислотность (1-5)");
    const sweetIdx = headers.indexOf("сладость (1-5)");
    const bodyIdx = headers.indexOf("плотность (1-5)");
    const notesIdx = headers.indexOf("ноты вкуса");
    const methodsIdx = headers.indexOf("способы заваривания");
    const priceIdx = headers.indexOf("цена (руб)");
    
    let imgIdx = headers.indexOf("ссылка на фото");
    if (imgIdx === -1) imgIdx = headers.indexOf("фото");
    if (imgIdx === -1) imgIdx = headers.indexOf("картинка");
    if (imgIdx === -1) imgIdx = headers.indexOf("изображение");
    if (imgIdx === -1) imgIdx = headers.indexOf("image");
    if (imgIdx === -1) imgIdx = headers.indexOf("img");
    if (imgIdx === -1) {
      imgIdx = headers.findIndex(h => h.includes("фото") || h.includes("картинка") || h.includes("изображ") || h.includes("image") || h.includes("ссылка"));
    }

    const products: Product[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 2) continue;

      const flavorNotes = r[notesIdx] ? r[notesIdx].split(",").map(n => n.trim().replace(/^"|"$/g, '')) : [];
      const methods = r[methodsIdx] ? r[methodsIdx].split(",").map(m => m.trim().replace(/^"|"$/g, '')) : [];

      const productName = r[nameIdx] || "Без названия";
      const productType = r[typeIdx] || "Моносорт";
      const productDesc = r[descIdx] || "";

      products.push({
        id: r[idIdx] || `C00${i}`,
        name: productName,
        type: productType,
        description: productDesc,
        roast: r[roastIdx] || "Средняя",
        acidity: parseInt(r[acidIdx]) || 1,
        sweetness: parseInt(r[sweetIdx]) || 1,
        body: parseInt(r[bodyIdx]) || 1,
        flavorNotes,
        methods,
        price: parseFloat(r[priceIdx]) || 1000,
        image: getDirectImageUrl(
          imgIdx !== -1 ? r[imgIdx] : undefined,
          productName,
          productType,
          productDesc
        ),
      });
    }
    return products;
  } catch (error) {
    console.error("Error fetching catalog from sheet:", error);
    return [];
  }
}

// Fetch and Parse FAQ
async function fetchFAQ(): Promise<FAQItem[]> {
  try {
    const res = await fetch(FAQ_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csvText = await res.text();
    const rows = parseCSV(csvText);

    // Header check: Ключевой запрос (вопрос), Ответ бариста (без разметки), Категория
    const headers = rows[0]?.map(h => h.toLowerCase()) || [];
    const questionIdx = headers.indexOf("ключевой запрос (вопрос)");
    const answerIdx = headers.indexOf("ответ бариста (без разметки)");
    const categoryIdx = headers.indexOf("категория");

    const faq: FAQItem[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 2) continue;

      faq.push({
        question: r[questionIdx] || "",
        answer: r[answerIdx] || "",
        category: r[categoryIdx] || "Общее",
      });
    }
    return faq;
  } catch (error) {
    console.error("Error fetching FAQ from sheet:", error);
    return [];
  }
}

// Sync Data with Google Sheets (Cache with TTL)
async function ensureDataCached() {
  const now = Date.now();
  if (!catalogCache || !faqCache || now - cacheTimestamp > CACHE_TTL) {
    console.log("Refreshing sheet cache...");
    const [cat, faq] = await Promise.all([fetchCatalog(), fetchFAQ()]);
    if (cat.length > 0) catalogCache = cat;
    if (faq.length > 0) faqCache = faq;
    cacheTimestamp = now;
  }
}

// Google Sheet Log Writing using Service Account JWT
function signGoogleJWT(clientEmail: string, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signInput = `${base64Header}.${base64Claim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const signature = signer.sign(formattedKey, 'base64url');

  return `${signInput}.${signature}`;
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = signGoogleJWT(clientEmail, privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// Append log entry to Google Sheet
async function appendLogToGoogleSheet(log: LogEntry) {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!clientEmail || !privateKey) {
      console.log("Google Service Account not configured, skipping Google Sheet append.");
      return;
    }

    const token = await getGoogleAccessToken(clientEmail, privateKey);
    const rowValues = [[
      log.timestamp,
      log.query,
      log.foundInTable,
      log.usedAI,
      log.answer
    ]];

    const appendRes = await fetch(LOGS_WRITE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rowValues
      })
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      console.error(`Google Sheets API append failed: ${appendRes.status}`, errText);
    } else {
      console.log("Logged successfully to Google Sheet!");
    }
  } catch (error) {
    console.error("Failed to append log to Google Sheet:", error);
  }
}

// Add local log and try Google Sheet sync
async function addLog(log: LogEntry) {
  localLogs.unshift(log); // Add to beginning
  if (localLogs.length > 200) localLogs.pop(); // Keep last 200 logs

  // Save to file
  try {
    fs.writeFileSync(LOCAL_LOGS_FILE, JSON.stringify(localLogs, null, 2));
  } catch (err) {
    console.error("Failed to write local logs file:", err);
  }

  // Google Sheet append
  await appendLogToGoogleSheet(log);
}

// Matching logic for FAQ
function findFAQMatch(query: string, faqs: FAQItem[]): FAQItem | null {
  const normQuery = query.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  if (!normQuery) return null;

  // 1. Try exact match (normalized)
  for (const item of faqs) {
    const normQ = item.question.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    if (normQ === normQuery) {
      return item;
    }
  }

  // 2. Try substring match where FAQ question is inside user query or vice versa
  for (const item of faqs) {
    const normQ = item.question.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    if (normQ.length > 3 && (normQuery.includes(normQ) || normQ.includes(normQuery))) {
      return item;
    }
  }

  // 3. Simple word overlap match (must have high overlap for short queries)
  const queryWords = normQuery.split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return null;

  let bestMatch: FAQItem | null = null;
  let bestOverlap = 0;

  for (const item of faqs) {
    const normQ = item.question.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const qWords = normQ.split(/\s+/).filter(w => w.length > 2);
    
    let overlap = 0;
    for (const w of queryWords) {
      if (qWords.includes(w)) overlap++;
    }

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = item;
    }
  }

  // Only count as match if at least 50% of the query words match or at least 1 keyword for short queries
  if (bestMatch) {
    const overlapThreshold = Math.max(1, Math.ceil(queryWords.length * 0.5));
    if (bestOverlap >= overlapThreshold) {
      return bestMatch;
    }
  }

  return null;
}

// Endpoints

// Get Catalog
app.get("/api/catalog", async (req, res) => {
  await ensureDataCached();
  res.json(catalogCache || []);
});

// Get FAQ
app.get("/api/faq", async (req, res) => {
  await ensureDataCached();
  res.json(faqCache || []);
});

// Get Logs
app.get("/api/logs", (req, res) => {
  res.json(localLogs);
});

// Clear Logs (Local only)
app.post("/api/logs/clear", (req, res) => {
  localLogs = [];
  try {
    fs.writeFileSync(LOCAL_LOGS_FILE, JSON.stringify([], null, 2));
  } catch (err) {
    console.error(err);
  }
  res.json({ success: true });
});

// Post Order
app.post("/api/orders", async (req, res) => {
  const { order } = req.body;
  
  // Log the successful payment/order placement as a system action
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logMessage: LogEntry = {
    timestamp,
    query: `Оформлен заказ №${order.id} (${order.customerName})`,
    foundInTable: 'Нет',
    usedAI: 'Система',
    answer: `Заказ на сумму ${order.totalAmount} руб успешно оформлен и оплачен. Способ доставки: ${order.deliveryMethod}, Оплата: ${order.paymentMethod}.`
  };

  await addLog(logMessage);
  res.json({ success: true, orderId: order.id });
});

// AI Chat
app.post("/api/chat", async (req, res) => {
  const { messages, query } = req.body as { messages: Message[], query: string };

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  await ensureDataCached();

  const faqs = faqCache || [];
  const catalog = catalogCache || [];

  // Match query in local FAQ
  const matchedFAQ = findFAQMatch(query, faqs);
  const foundInTable = matchedFAQ ? "Да" : "Нет";

  // Build context
  let faqGrounding = "";
  if (matchedFAQ) {
    faqGrounding = `НАЙДЕННЫЙ ОТВЕТ ИЗ БАЗЫ ЗНАНИЙ:\nВопрос: ${matchedFAQ.question}\nОтвет: ${matchedFAQ.answer}\n\n`;
  }

  const catalogGrounding = `КАТАЛОГ ТОВАРОВ МАГАЗИНА:\n${catalog.map(p => {
    return `- ID: [${p.id}], Название: "${p.name}", Тип: "${p.type}", Обжарка: "${p.roast}", Кислотность: ${p.acidity}, Сладость: ${p.sweetness}, Плотность: ${p.body}, Цена: ${p.price} руб, Ноты: "${p.flavorNotes.join(', ')}", Способы заваривания: "${p.methods.join(', ')}", Описание: "${p.description}"`;
  }).join("\n")}`;

  const systemPrompt = `Ты — Кофейный сомелье онлайн-магазина свежеобжаренного кофе.
Магазин продаёт: свежеобжаренный кофе в зёрнах и молотый (моносорта и бленды), кофейное оборудование (турки, воронки, кемексы, аэропрессы, гейзеры), подписку на регулярную доставку (раз в 2, 3 или 4 недели), сопутствующие товары (чашки, темперы, фильтры, весы).

Ты — профессиональный бариста-консультант с многолетним опытом. Общаешься уважительно, на «Вы», с заботой о клиенте. Твоя цель — помочь клиенту сделать лучший выбор под его вкус и способ заваривания.

Твоя задача:
- Подбираешь сорт под вкусовые предпочтения (кислотность, сладость, плотность).
- Подсказываешь помол под способ заваривания (эспрессо, турка, воронка, аэропресс).
- Объясняешь, как оформить подписку и управлять расписанием.
- Консультируешь по срокам хранения свежеобжаренного кофе.
- Даёшь информацию по доставке, оплате, возврату.
- Рекомендуешь оборудование и рецепты заваривания.

ОГРАНИЧЕНИЯ (КРИТИЧЕСКИ ВАЖНО):
1. НЕ даёшь медицинских рекомендаций. На вопросы о здоровье, давлении, похудении, кофеине ВСЕГДА отвечай точно этой фразой: «Это вопрос к врачу. Я помогаю выбрать кофе по вкусу и аромату!»
2. НЕ обсуждаешь сторонние темы. Если вопрос не про кофе, оборудование, подписку или доставку — вежливо напоминаешь, что ты консультант кофейного магазина, и предлагаешь помощь с выбором кофе.
3. НЕ рассказываешь анекдоты, шутки, стихи, не отвечаешь на провокации.
4. Отвечай вежливо, дружелюбно и на Вы. Эмодзи используй минимально (не более 1-2 на ответ). Ответы должны быть краткими, структурированными и по делу.
5. Для ответов используй базу знаний магазина Google Sheets (которая приведена ниже) и рекомендуй товары из нашего каталога.
6. Если информации нет в предоставленной базе знаний, честно скажи об этом. Ты можешь дать общедоступную информацию из интернета, но ОБЯЗАТЕЛЬНО явно укажи, что этой информации нет в нашей базе знаний и ты даешь общие сведения из интернета.
7. Когда Вы рекомендуете кофе из нашего каталога, обязательно указывайте его ID в квадратных скобках, например [C001], чтобы интерфейс мог показать карточку товара. Не придумывай несуществующие ID товаров.
8. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выводить позиции из каталога отдельными строками, отдельными абзацами, списками или в виде перечня. Рекомендуйте только 1-2 наиболее подходящих товара под конкретный запрос пользователя. При упоминании товара пишите его название и ID в квадратных скобках (например, «Бразилия Сантос [C001]») прямо внутри текста предложения, не перенося на новую строку.
9. АБСОЛЮТНО ЗАПРЕЩЕНО использовать какую-либо разметку Markdown (заголовки #, жирный шрифт с помощью **, курсив *, списки со звездочками или дефисами). Пишите ответ только чистым, обычным текстом, разделяя смысловые части простыми абзацами с переносом строки. Никаких спецсимволов разметки!

${faqGrounding}
${catalogGrounding}

Общайся только на русском языке. Ответ должен быть кратким, профессиональным и без разметки Markdown.`;

  let aiResponse = "";
  let usedModel = "Да (VseGPT)";

  const vsegptApiKey = process.env.VSEGPT_API_KEY;

  if (vsegptApiKey) {
    let attempts = 0;
    const maxAttempts = 1;

    while (attempts < maxAttempts && !aiResponse) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

      try {
        // Call VseGPT API (OpenAI style)
        const vsegptRes = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${vsegptApiKey}`
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content })),
              { role: "user", content: query }
            ],
            temperature: 0.3,
            max_tokens: 800
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (vsegptRes.ok) {
          const resData = await vsegptRes.json() as any;
          aiResponse = resData.choices?.[0]?.message?.content || "";
          console.log("VseGPT Response:", aiResponse);
          usedModel = "Да (VseGPT)";
        } else {
          const errorText = await vsegptRes.text();
          console.log(`VseGPT HTTP Warning (Attempt ${attempts}):`, vsegptRes.status, errorText);
          if (vsegptRes.status < 500) {
            break; // Don't retry client errors (4xx)
          }
        }
      } catch (err: any) {
  clearTimeout(timeoutId);
  console.log(`VseGPT call failed (Attempt ${attempts}):`, {
    message: err.message,
    name: err.name,
    cause: err.cause
  });
}
    }
  }

  // Gemini Fallback
  if (!aiResponse && process.env.GEMINI_API_KEY) {
    try {
      console.log("Trying Gemini fallback...");
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const geminiRes = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite", // Using gemini-3.1-flash-lite which works
        contents: `История чата:\n${messages.map(h => `${h.role === 'user' ? 'Клиент' : 'Бариста'}: ${h.content}`).join('\n')}\n\nНовый запрос клиента: ${query}`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        }
      });
      aiResponse = geminiRes.text || "";
      if (aiResponse) {
        console.log("Gemini Response:", aiResponse);
        usedModel = "Да (Gemini Fallback)";
      }
    } catch (err: any) {
      console.log("Gemini fallback warning:", err.message || err);
    }
  }

  // If both failed or returned empty
  if (!aiResponse) {
    aiResponse = "Извините, возникла временная техническая сложность с подключением к моему кофейному разуму. Давайте я подскажу Вам классический сорт: Бразилия Сантос [C001] — это мягкий кофе с нотами шоколада и орехов, отлично подходит для эспрессо или турки!";
  }

  // Extract recommended product IDs (e.g. [C001])
  const suggestedProducts: Product[] = [];
  const idRegex = /\[(C\d+)\]/g;
  let match;
  const matchedIds = new Set<string>();
  while ((match = idRegex.exec(aiResponse)) !== null) {
    matchedIds.add(match[1]);
  }

  matchedIds.forEach(id => {
    const prod = catalog.find(p => p.id === id);
    if (prod) suggestedProducts.push(prod);
  });

  // Log interaction
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logEntry: LogEntry = {
    timestamp,
    query,
    foundInTable,
    usedAI: usedModel,
    answer: aiResponse
  };

  // Add log asynchronously
  addLog(logEntry).catch(err => console.error("Error writing logs:", err));

  res.json({
    response: aiResponse,
    suggestedProducts
  });
});

// Vite middleware and routing setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
