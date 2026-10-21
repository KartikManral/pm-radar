import nodemailer from "nodemailer";
import { SITE_NAME, SITE_URL } from "./config";
import type { TodayQuestion } from "./practice";
import { LEVEL_LABELS, type Job } from "./types";

// Uses any SMTP server. Easiest free option: a Gmail account with an
// app password (SMTP_USER = your Gmail, SMTP_PASS = the 16-letter app password).
export function mailer() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user, pass },
  });
}

export const FROM = () => process.env.MAIL_FROM || `${SITE_NAME} <${process.env.SMTP_USER}>`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function ago(ms: number | null) {
  if (!ms) return "";
  const h = Math.round((Date.now() - ms) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function practiceHtml(p: TodayQuestion | null) {
  if (!p) return "";
  return `
      <tr><td style="padding:20px 0 4px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F5;border-radius:8px"><tr><td style="padding:16px">
          <div style="font:700 12px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#5A6168">Today's practice question</div>
          <div style="font:600 16px/1.4 Arial,sans-serif;color:#131619;margin-top:6px">${esc(p.question)}</div>
          <div style="font:12px/1.5 Arial,sans-serif;color:#5A6168;margin-top:4px">${esc(p.categoryLabel)} &nbsp;|&nbsp; ${esc(p.difficulty)} &nbsp;|&nbsp; ${p.minutes} min</div>
          <a href="${esc(p.url)}" style="display:inline-block;margin-top:10px;font:600 13px Arial,sans-serif;color:#0F766E">Answer it on Product Reps and get AI feedback</a>
        </td></tr></table>
      </td></tr>`;
}

export function digestHtml(jobs: Job[], token: string, intro: string, practice: TodayQuestion | null = null) {
  const rows = jobs
    .map(
      (j) => `
      <tr><td style="padding:14px 0;border-bottom:1px solid #E2E5E3">
        <a href="${esc(j.url)}" style="font:600 16px/1.35 Arial,sans-serif;color:#131619;text-decoration:none">${esc(j.title)}</a>
        <div style="font:14px/1.5 Arial,sans-serif;color:#5A6168;margin-top:2px">${esc(j.company)} &nbsp;|&nbsp; ${esc(j.location)}</div>
        <div style="font:12px/1.5 Arial,sans-serif;color:#5A6168;margin-top:4px">
          ${LEVEL_LABELS[j.level]} &nbsp;&nbsp; via ${esc(j.sourceLabel)} &nbsp;&nbsp; ${ago(j.postedAt)}
        </div>
        <a href="${esc(j.url)}" style="display:inline-block;margin-top:8px;font:600 13px Arial,sans-serif;color:#0F766E">Apply on ${esc(j.sourceLabel)}</a>
      </td></tr>`
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#F6F7F5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F5"><tr><td align="center" style="padding:24px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;padding:24px">
      <tr><td style="font:700 20px Arial,sans-serif;color:#131619">${SITE_NAME}</td></tr>
      <tr><td style="font:15px/1.5 Arial,sans-serif;color:#131619;padding:8px 0 4px">${esc(intro)}</td></tr>
      ${rows}
      ${practiceHtml(practice)}
      <tr><td style="padding-top:18px;font:14px Arial,sans-serif">
        <a href="${SITE_URL}" style="color:#0F766E;font-weight:600">See all roles and check your resume match</a>
      </td></tr>
      <tr><td style="padding-top:20px;font:12px/1.5 Arial,sans-serif;color:#868C92">
        You get this because you subscribed on ${SITE_NAME}.
        <a href="${SITE_URL}/api/unsubscribe?token=${token}" style="color:#868C92">Unsubscribe</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export function digestText(jobs: Job[], token: string, intro: string, practice: TodayQuestion | null = null) {
  return [
    intro,
    "",
    ...jobs.map((j) => `${j.title} - ${j.company} (${j.location})\n${j.url}\n`),
    ...(practice ? [`Today's practice question (${practice.categoryLabel}): ${practice.question}`, `Answer it on Product Reps: ${practice.url}`, ""] : []),
    `All roles: ${SITE_URL}`,
    `Unsubscribe: ${SITE_URL}/api/unsubscribe?token=${token}`,
  ].join("\n");
}
