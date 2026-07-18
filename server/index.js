// Express server for Render — a persistent Node process, not a serverless function.
// No short execution-time ceiling to fight against, which is exactly what
// Puppeteer + headless Chrome wants for reliable PDF generation.

import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import { buildQuotationDocument } from "./_mkjTemplate.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Allow the frontend (deployed separately, e.g. on Netlify) to call this server.
// Set ALLOWED_ORIGIN in Render's environment variables to your actual frontend
// URL once you know it (e.g. https://your-site.netlify.app). "*" works too but
// is looser than you'd want for a production quotation tool with pricing data.
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));

// A browser instance is expensive to start — keep one alive across requests
// instead of launching fresh Chrome on every single PDF request.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/generate-pdf", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.customer || !Array.isArray(data.days)) {
      return res.status(400).json({ error: "Missing required fields (customer, days[])" });
    }

    const html = buildQuotationDocument(data);
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
      });

      const filename = `${(data.customer || "Quotation").replace(/\s+/g, "_")}_${data.quotationNo || ""}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(pdfBuffer);
    } finally {
      await page.close(); // close the page, but keep the shared browser instance alive
    }
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ error: "PDF generation failed", detail: String((err && err.message) || err) });
  }
});

app.listen(PORT, () => {
  console.log(`MKJ PDF server listening on port ${PORT}`);
});
