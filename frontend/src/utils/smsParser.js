/**
 * Smart SMS parser for Bangladeshi Mobile Financial Services (bKash, Nagad, Rocket)
 * and Bank / Card transaction SMS alerts.
 */

export function parseTransactionSms(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Extract Amount
  // Matches: "Tk 1,500.00", "Tk. 500", "BDT 2500.50", "Tk 500", "Amount: Tk 200"
  const amountRegex = /(?:tk\.?|bdt|amount(?:\s*is)?:?)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const matchAmount = text.match(amountRegex);

  let amount = null;
  if (matchAmount && matchAmount[1]) {
    const cleanNum = matchAmount[1].replace(/,/g, "");
    const parsed = parseFloat(cleanNum);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  if (!amount) {
    // Fallback: look for standalone number followed by Tk or BDT
    const fallbackRegex = /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:tk|bdt)/i;
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch && fallbackMatch[1]) {
      const cleanNum = fallbackMatch[1].replace(/,/g, "");
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }
  }

  if (!amount) {
    return null;
  }

  // 2. Extract TrxID / TxnId / Ref
  const trxMatch = text.match(/(?:trxid|txnid|txn\s*id|transaction\s*id|ref(?:erence)?)\s*[:.]?\s*([A-Za-z0-9]+)/i);
  const trxId = trxMatch ? trxMatch[1] : "";

  // 3. Extract Fee
  const feeMatch = text.match(/fee\s*(?:tk\.?|bdt)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const fee = feeMatch ? parseFloat(feeMatch[1].replace(/,/g, "")) : 0;

  // 4. Detect Provider & Type
  let provider = "Bank/SMS";
  if (lower.includes("bkash")) provider = "bKash";
  else if (lower.includes("nagad")) provider = "Nagad";
  else if (lower.includes("rocket")) provider = "Rocket";
  else if (lower.includes("upay")) provider = "Upay";
  else if (lower.includes("card") || lower.includes("pos")) provider = "Bank Card";

  let transactionType = "expense"; // default
  let category = "General";
  let suggestedTitle = `${provider} Payment`;

  if (lower.includes("received") || lower.includes("cash in") || lower.includes("credited")) {
    transactionType = "income";
    suggestedTitle = `${provider} Money Received`;
    category = "Salary";
  } else if (lower.includes("cash out") || lower.includes("atm")) {
    transactionType = "expense";
    suggestedTitle = `${provider} Cash Out`;
    category = "Utilities";
  } else if (lower.includes("send money") || lower.includes("transfer")) {
    transactionType = "expense";
    suggestedTitle = `${provider} Transfer`;
    category = "General";
  } else if (lower.includes("payment") || lower.includes("merchant") || lower.includes("pos")) {
    transactionType = "expense";
    suggestedTitle = `${provider} Purchase`;
    category = "Shopping";
  } else if (lower.includes("bill") || lower.includes("recharge")) {
    transactionType = "expense";
    suggestedTitle = `${provider} Bill / Recharge`;
    category = "Utilities";
  }

  // Look for merchant / receiver name
  const toMatch = text.match(/to\s+([A-Za-z0-9\s.,&'-]+?)(?:\s+fee|\s+balance|\s+trxid|\s+on|\.|$)/i);
  if (toMatch && toMatch[1] && toMatch[1].trim().length > 1 && toMatch[1].trim().length < 35) {
    suggestedTitle = `${provider}: ${toMatch[1].trim()}`;
  }

  // 5. Build description
  const notesArr = [];
  if (trxId) notesArr.push(`TrxID: ${trxId}`);
  if (fee > 0) notesArr.push(`Fee: Tk ${fee}`);
  notesArr.push(`Parsed from ${provider} SMS`);

  return {
    amount,
    title: suggestedTitle,
    category,
    transactionType,
    fee,
    trxId,
    provider,
    date: new Date().toISOString().slice(0, 10),
    description: notesArr.join(" | "),
    rawText: text,
  };
}
