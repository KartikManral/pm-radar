import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SITE_NAME } from "./config";
import { ago } from "./time";
import { LEVEL_LABELS, type Job } from "./types";

// Builds a PDF of the roles currently shown, with clickable apply links.
export function exportJobsPdf(jobs: Job[], now: number) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const date = new Date(now).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(19, 22, 25);
  doc.text(`${SITE_NAME}: product roles`, 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 97, 104);
  doc.text(`${jobs.length} roles, ${date}. Click a title to open the job post.`, 40, 68);

  autoTable(doc, {
    startY: 84,
    head: [["Role", "Company", "Location", "Level", "Posted"]],
    body: jobs.map((j) => [j.title, j.company, j.location, LEVEL_LABELS[j.level], ago(j.postedAt, now)]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: [19, 22, 25], overflow: "linebreak" },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 247, 245] },
    columnStyles: { 0: { cellWidth: 175, textColor: [15, 118, 110] }, 1: { cellWidth: 90 }, 2: { cellWidth: 120 }, 3: { cellWidth: 70 } },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const job = jobs[data.row.index];
        doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: job.url });
      }
    },
  });

  doc.save(`pm-roles-${new Date(now).toISOString().slice(0, 10)}.pdf`);
}
