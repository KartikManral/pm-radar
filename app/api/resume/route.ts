import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { extractText, getDocumentProxy } from "unpdf";
import { htmlToText } from "@/lib/classify";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PDF_BYTES = 5 * 1024 * 1024;

// Turns an uploaded PDF or a portfolio link into plain text.
// Nothing is stored on the server; the browser keeps the text.
export async function POST(req: Request) {
  try {
    const type = req.headers.get("content-type") || "";

    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return err("Choose a PDF file to upload.");
      if (file.size > MAX_PDF_BYTES) return err("That PDF is over 5 MB. Export a smaller copy and try again.");
      const buf = new Uint8Array(await file.arrayBuffer());
      if (String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") return err("That file isn't a PDF. Upload your resume as a PDF.");
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      const clean = String(text).replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
      if (clean.length < 200)
        return err("We couldn't read text from this PDF. It may be a scanned image; export it from Word or Google Docs instead.");
      return NextResponse.json({ text: clean.slice(0, 15000), label: file.name });
    }

    const { url } = (await req.json()) as { url?: string };
    if (!url) return err("Paste a link to your portfolio or resume.");
    const text = await fetchPortfolio(url);
    if (text.length < 200)
      return err("That page has too little text to analyse. Try a link to your resume or a page that lists your projects.");
    return NextResponse.json({ text: text.slice(0, 15000), label: new URL(url).hostname });
  } catch (e: any) {
    return err(e?.publicMessage ?? "Something went wrong reading that. Try a PDF upload instead.");
  }
}

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function publicError(msg: string) {
  return Object.assign(new Error(msg), { publicMessage: msg });
}

function isPrivateIp(ip: string) {
  if (ip.includes(":")) return ip === "::1" || /^f[cd]|^fe80/i.test(ip) || ip.startsWith("::ffff:127.");
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

// Block links that point inside our own network.
async function assertPublicHost(u: URL) {
  if (!["http:", "https:"].includes(u.protocol)) throw publicError("Only http and https links work.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw publicError("We couldn't find that website. Check the link.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw publicError("That link can't be used.");
}

async function fetchPortfolio(raw: string): Promise<string> {
  let u: URL;
  try {
    u = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw publicError("That doesn't look like a link. It should start with https://");
  }
  // Follow up to 3 redirects ourselves so every hop gets checked.
  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHost(u);
    res = await fetch(u, {
      headers: { "User-Agent": "PMRadar/1.0 (resume reader)", Accept: "text/html,application/pdf" },
      signal: AbortSignal.timeout(10_000),
      redirect: "manual",
    });
    const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!next) break;
    u = new URL(next, u);
  }
  if (!res || !res.ok) throw publicError(`That page returned an error (${res?.status}). Make sure it's public.`);

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("pdf")) {
    const buf = new Uint8Array(await res.arrayBuffer());
    const { text } = await extractText(await getDocumentProxy(buf), { mergePages: true });
    return String(text).trim();
  }
  const html = (await res.text()).slice(0, 600_000);
  return htmlToText(html, 15000);
}
