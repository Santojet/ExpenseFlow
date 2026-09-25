/**
 * Convert array of objects to CSV string and trigger download
 */
export function exportToCsv(data, filename = "export.csv") {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        let val = row[header];
        if (val === null || val === undefined) val = "";
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",")
  );

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a clean, professional PDF Financial Statement using jsPDF
 */
export async function generatePdfStatement({
  title = "ExpenseFlow Pro Financial Statement",
  dateRange = "",
  totalExpenses = 0,
  totalLent = 0,
  totalBorrowed = 0,
  expenses = [],
  currency = "৳",
  t = {},
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, "F");

  // Accent Line
  doc.setFillColor(124, 58, 237); // violet-600
  doc.rect(0, 38, pageWidth, 2.5, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("ExpenseFlow Pro", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(title, 14, 26);
  if (dateRange) {
    doc.text(`Period: ${dateRange}`, 14, 32);
  }

  // Generation Date
  const genDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  doc.text(`Generated: ${genDate}`, pageWidth - 14, 26, { align: "right" });

  // Summary Metrics Section
  let y = 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Executive Summary", 14, y);
  y += 6;

  // 3 Metric Cards (Expense, Lent, Borrowed)
  const cardWidth = (pageWidth - 28 - 8) / 3;
  const cards = [
    { label: "Total Expenses", value: `${currency} ${Number(totalExpenses).toLocaleString()}`, color: [239, 68, 68] },
    { label: "Total Lent (Receivable)", value: `${currency} ${Number(totalLent).toLocaleString()}`, color: [16, 185, 129] },
    { label: "Total Borrowed (Payable)", value: `${currency} ${Number(totalBorrowed).toLocaleString()}`, color: [245, 158, 11] },
  ];

  cards.forEach((card, idx) => {
    const cardX = 14 + idx * (cardWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, y, cardWidth, 20, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cardX + 4, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, cardX + 4, y + 15);
  });

  y += 28;

  // Expenses Table Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Recent Expense Transactions", 14, y);
  y += 6;

  // Table columns: Date, Title, Category, Amount
  const colX = [14, 45, 120, pageWidth - 14];
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Date", colX[0] + 2, y + 5.5);
  doc.text("Description", colX[1], y + 5.5);
  doc.text("Category", colX[2], y + 5.5);
  doc.text("Amount", colX[3] - 2, y + 5.5, { align: "right" });
  y += 8;

  // Table Rows (Max 35 rows for first page readability)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const displayExpenses = expenses.slice(0, 32);
  displayExpenses.forEach((exp, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 7, "F");
    }

    doc.setTextColor(30, 41, 59);
    doc.text(String(exp.expense_date || "").slice(0, 10), colX[0] + 2, y + 4.8);

    const safeTitle = (exp.title || "Untitled").length > 40 ? exp.title.slice(0, 38) + "..." : exp.title;
    doc.text(safeTitle, colX[1], y + 4.8);

    doc.setTextColor(100, 116, 139);
    doc.text(String(exp.category || "General"), colX[2], y + 4.8);

    doc.setTextColor(239, 68, 68);
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${Number(exp.amount || 0).toLocaleString()}`, colX[3] - 2, y + 4.8, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 7;
  });

  // Footer Page Number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by ExpenseFlow Pro • Financial Intelligence System", 14, 290);
  doc.text("Page 1 of 1", pageWidth - 14, 290, { align: "right" });

  doc.save(`ExpenseFlow_Statement_${new Date().toISOString().slice(0, 10)}.pdf`);
}
