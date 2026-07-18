// Builds the full MKJ Travel-branded HTML document (Quotation page + Itinerary pages)
// from a resolved payload. This is rendered server-side by Puppeteer into a real PDF.

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildQuotationPage(data) {
  const { customer, phone, quotationNo, quotationDate, rate, adults, children, infants,
          sellAdult, sellChild, sellInfant, totalYen, totalRM, depositRM, packageName } = data;

  const toRM = (yen) => (yen / rate / 10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtY = (n) => `¥${Math.round(n).toLocaleString()}`;

  const rows = [
    { label: `${adults} Adult`, price: sellAdult, amount: sellAdult * adults, show: adults > 0 },
    { label: `${children} Child`, price: sellChild, amount: sellChild * children, show: children > 0 },
    { label: `${infants} Infant`, price: sellInfant, amount: sellInfant * infants, show: infants > 0 },
  ].filter((r) => r.show);

  const rowsHtml = rows.map((r, i) => `
    <tr>
      ${i === 0 ? `<td class="desc" rowspan="${rows.length}">${esc(packageName)}</td>` : ""}
      <td>${esc(r.label)}</td>
      <td>${fmtY(r.price)}<span class="rm-sub">RM ${toRM(r.price)}</span></td>
      <td class="amount-cell">${fmtY(r.amount)}<span class="rm-sub">RM ${toRM(r.amount)}</span></td>
    </tr>`).join("");

  return `
  <div class="page">
    <div class="brand-header">
      <div class="logo">MKJ <span style="color:#F4C430;">travel</span><br><span class="sub">TOUR GUIDE</span></div>
      <div class="quotation-badge">QUOTATION</div>
    </div>
    <div class="customer-block">
      <div class="name">${esc(customer)}</div>
      <div class="phone">${esc(phone || "")}</div>
    </div>
    <div class="fx-box">
      <div class="fx-title">Price below is based on exchange<br>rate as of today</div>
      <div class="fx-row">RM &nbsp;&#8644;&nbsp; YEN</div>
      <div class="qr-placeholder"></div>
      <div class="fx-rate">RM ${rate} = 1,000 JPY</div>
      <div class="fx-caption">CURRENT EXCHANGE RATE</div>
    </div>
    <div class="clear"></div>
    <div class="quo-meta">
      <div class="seg no"><span class="label">Quotation No.</span><span class="value">#${esc(quotationNo)}</span></div>
      <div class="seg date"><span class="label">Quotation Date</span><span class="value">${esc(quotationDate)}</span></div>
    </div>
    <table class="items">
      <thead><tr><th>Description</th><th>Quantity</th><th>Price Per Pax</th><th class="amount-head">Amount</th></tr></thead>
      <tbody>${rowsHtml}<tr class="spacer"><td colspan="4"></td></tr></tbody>
    </table>
    <div class="totals">
      <div class="row total-row"><span class="lbl">Total Amount :</span><span class="val">${fmtY(totalYen)}<span class="rm-sub" style="color:#16283D;">RM ${toRM(totalYen)}</span></span></div>
    </div>
    <div class="totals" style="margin-top:8px;">
      <div class="row deposit-row"><span class="lbl">Deposit :</span><span class="val">RM ${esc(depositRM)}</span></div>
    </div>
    <div class="contact-chips">
      <div class="chip"><div class="icon"></div> 011-5758 8123</div>
      <div class="chip"><div class="icon"></div> sales@melancongkejepun.com</div>
      <div class="chip"><div class="icon"></div> Melancongkejepun.com</div>
      <div class="chip"><div class="icon"></div> Melancong Ke Jepun</div>
    </div>
    <div class="payment-method">
      <div class="title">Deposit Payment Method</div>
      <div class="row">Bank Acc Name :</div>
      <div class="row" style="font-weight:bold; font-size:13px;">MKJ GLOBAL</div>
      <div class="row" style="margin-top:6px;">Bank Acc Number :</div>
      <div class="row"><span class="bank-badge">Maybank</span><b>5624 3252 4255</b></div>
    </div>
    <div class="team-photo"><div class="stripe"></div></div>
  </div>`;
}

function buildDayBlock(day) {
  const chainHtml = day.chain.map((s, i) =>
    `${esc(s)}${i < day.chain.length - 1 ? '<span class="arrow">&darr;</span>' : ""}`
  ).join("\n");
  const includeHtml = day.include.map((s) =>
    `<div class="item"><span class="check">&#9989;</span> ${esc(s)}</div>`
  ).join("");
  const narrativeHtml = day.narrative.split("\n\n").map((p) => `<p>${esc(p)}</p>`).join("");

  return `
    <div class="day-block">
      <div class="day-header-row">
        <div class="day-tag">DAY ${day.dayNumber}</div>
        <div class="route-title">${esc(day.routeTitle)}</div>
      </div>
      <div class="day-body">
        <div class="left-col">
          <div class="date">${esc(day.date)}</div>
          <div class="day-name">${esc(day.dayName)}</div>
          <div class="route-chain">${chainHtml}</div>
          <div class="include-title">INCLUDE :</div>
          <div class="include-list">${includeHtml}</div>
        </div>
        <div class="right-col">
          ${narrativeHtml}
          ${day.nota ? `<div class="nota"><b>Nota :</b> ${esc(day.nota)}</div>` : ""}
        </div>
      </div>
    </div>`;
}

function buildItineraryPages(days, quotationNo) {
  // 2 days per page, matching the reference design
  const pages = [];
  for (let i = 0; i < days.length; i += 2) {
    const pair = days.slice(i, i + 2);
    pages.push(`
    <div class="page">
      <div class="hero-banner">
        <div class="logo">MKJ <span style="color:#F4C430;">travel</span><br><span class="sub">TOUR GUIDE</span></div>
        <div class="title">ITINERARY PERCUTIAN</div>
        <div class="photo-strip"></div>
        <div class="watermark">#${esc(quotationNo)}</div>
      </div>
      ${pair.map(buildDayBlock).join("\n")}
    </div>`);
  }
  return pages.join("\n");
}

const STYLE = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #FFFFFF; color: #16283D; }
  .page { width: 210mm; min-height: 297mm; background: #FFFFFF; position: relative; overflow: hidden; break-after: page; page-break-after: always; }
  .page:last-child { break-after: auto; page-break-after: auto; }

  .brand-header { background: #0A2149; position: relative; padding: 22px 32px 34px 32px; overflow: hidden; }
  .brand-header::after { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 55%; background: #F4C430; clip-path: polygon(30% 0, 100% 0, 100% 100%, 0% 100%); }
  .brand-header .logo { position: relative; z-index: 2; float: right; text-align: right; color: #FFFFFF; font-weight: bold; font-size: 20px; line-height: 1.1; }
  .brand-header .logo .sub { font-size: 8px; letter-spacing: 3px; font-weight: normal; color: #0A2149; }
  .quotation-badge { background: #0F2C5C; color: #FFFFFF; display: inline-block; font-size: 26px; font-weight: bold; letter-spacing: 1px; padding: 10px 26px; margin-top: 30px; clip-path: polygon(0 0, 92% 0, 100% 100%, 0% 100%); }
  .customer-block { padding: 18px 32px 0 32px; }
  .customer-block .name { font-size: 22px; font-weight: bold; color: #0A2149; }
  .customer-block .phone { font-size: 14px; color: #5B6B7A; margin-top: 2px; }
  .fx-box { float: right; margin: -70px 32px 0 0; background: #F4C430; border-radius: 6px; padding: 10px 16px; width: 240px; text-align: center; font-size: 10px; color: #16283D; }
  .fx-box .fx-title { font-weight: bold; font-size: 10.5px; margin-bottom: 6px; }
  .fx-box .fx-row { font-size: 9px; font-weight: bold; margin: 6px 0; }
  .fx-box .fx-rate { font-weight: bold; font-size: 12px; margin-top: 4px; }
  .fx-box .fx-caption { font-size: 7px; color: #5B4A00; margin-top: 2px; }
  .qr-placeholder { width: 46px; height: 46px; background: repeating-conic-gradient(#16283D 0% 25%, #FFFFFF 0% 50%) 50% / 8px 8px; margin: 4px auto; border: 2px solid #FFFFFF; }
  .clear { clear: both; }
  .quo-meta { display: flex; margin: 24px 32px 0 32px; font-size: 11px; }
  .quo-meta .seg { flex: 1; padding: 10px 16px; }
  .quo-meta .seg.no { background: #0F2C5C; color: #FFFFFF; clip-path: polygon(0 0, 96% 0, 100% 100%, 0 100%); }
  .quo-meta .seg.date { background: #D9D9D9; color: #16283D; clip-path: polygon(4% 0, 100% 0, 100% 100%, 0 100%); margin-left: -14px; }
  .quo-meta .label { display: block; font-size: 9px; opacity: 0.8; }
  .quo-meta .value { display: block; font-weight: bold; font-size: 13px; margin-top: 2px; }
  table.items { width: calc(100% - 64px); margin: 20px 32px 0 32px; border-collapse: collapse; font-size: 12px; }
  table.items th { text-align: center; padding: 10px; border: 1px solid #0F2C5C; font-size: 11px; color: #0A2149; }
  table.items th.amount-head { background: #0F2C5C; color: #FFFFFF; }
  table.items td { border: 1px solid #0F2C5C; padding: 10px; vertical-align: top; text-align: center; }
  table.items td.desc { text-align: left; font-weight: bold; font-size: 13px; }
  table.items td.amount-cell { background: #0A2149; color: #FFFFFF; font-weight: bold; }
  table.items td .rm-sub { display: block; font-size: 9.5px; font-weight: normal; opacity: 0.85; margin-top: 2px; }
  table.items tbody tr.spacer td { border: none; height: 20px; }
  .totals { width: calc(100% - 64px); margin: 0 32px; display: flex; justify-content: flex-end; }
  .totals .lbl { font-weight: bold; font-size: 13px; padding: 10px 16px; }
  .totals .val { padding: 10px 16px; font-weight: bold; text-align: right; min-width: 130px; }
  .totals .total-row .val { background: #F4C430; color: #D32F2F; font-size: 16px; }
  .totals .deposit-row .val { background: #0F2C5C; color: #FFFFFF; font-size: 14px; }
  .contact-chips { margin: 26px 32px 0 32px; display: flex; flex-direction: column; gap: 6px; width: 260px; }
  .contact-chips .chip { display: flex; align-items: center; gap: 10px; background: #EDEDED; border-radius: 4px; padding: 7px 12px; font-size: 11px; }
  .contact-chips .icon { width: 20px; height: 20px; background: #0F2C5C; border-radius: 3px; flex-shrink: 0; }
  .team-photo { margin: 20px 0 0 0; width: 100%; height: 90px; background: #0A2149; position: relative; }
  .team-photo .stripe { position: absolute; bottom: 0; left: 0; right: 0; height: 8px; background: #F4C430; }
  .payment-method { position: absolute; right: 32px; bottom: 130px; width: 260px; font-size: 11px; }
  .payment-method .title { font-weight: bold; color: #0A2149; font-size: 14px; margin-bottom: 8px; }
  .payment-method .row { margin-bottom: 4px; }
  .payment-method .bank-badge { display: inline-block; background: #F4C430; font-weight: bold; padding: 4px 10px; border-radius: 4px; margin-right: 8px; font-size: 10px; }

  .hero-banner { background: #0A2149; position: relative; height: 150px; overflow: hidden; padding: 18px 32px; }
  .hero-banner .logo { color: #FFFFFF; font-weight: bold; font-size: 16px; line-height: 1.1; }
  .hero-banner .logo .sub { font-size: 7px; letter-spacing: 3px; font-weight: normal; color: #F4C430; }
  .hero-banner .title { color: #FFFFFF; font-size: 42px; font-weight: 900; letter-spacing: 1px; margin-top: 14px; text-shadow: 2px 2px 0 rgba(0,0,0,0.15); }
  .hero-banner .photo-strip { position: absolute; right: 0; top: 0; bottom: 0; width: 55%; background: #1B3A66; opacity: 0.9; }
  .hero-banner .watermark { position: absolute; right: 40px; bottom: 10px; color: rgba(255,255,255,0.15); font-size: 9px; letter-spacing: 1px; }
  .day-block { break-inside: avoid; }
  .day-header-row { display: flex; }
  .day-header-row .day-tag { background: #0A2149; color: #FFFFFF; font-weight: bold; font-size: 15px; padding: 12px 24px; width: 140px; text-align: center; flex-shrink: 0; }
  .day-header-row .route-title { background: #0F2C5C; color: #FFFFFF; font-weight: bold; font-size: 14px; padding: 12px 20px; flex: 1; display: flex; align-items: center; }
  .day-body { display: flex; border: 1px solid #CBD8E6; border-top: none; min-height: 180px; }
  .day-body .left-col { width: 160px; flex-shrink: 0; border-right: 1px solid #CBD8E6; padding: 16px 12px; font-size: 11px; text-align: center; }
  .left-col .date { font-weight: bold; font-size: 13px; color: #0A2149; }
  .left-col .day-name { font-weight: bold; font-size: 13px; color: #0A2149; margin-bottom: 10px; }
  .left-col .route-chain { font-size: 10.5px; color: #5B6B7A; line-height: 1.9; margin-bottom: 14px; }
  .left-col .route-chain .arrow { display: block; color: #B7C6D9; font-size: 12px; }
  .left-col .include-title { font-weight: bold; font-size: 10.5px; text-align: left; margin-bottom: 6px; color: #0A2149; }
  .left-col .include-list { text-align: left; font-size: 10px; color: #5B6B7A; line-height: 1.6; }
  .left-col .include-list .item { display: flex; gap: 5px; margin-bottom: 4px; }
  .left-col .include-list .check { color: #1FA855; flex-shrink: 0; }
  .day-body .right-col { flex: 1; padding: 16px 20px; font-size: 11.5px; line-height: 1.7; }
  .right-col p { margin: 0 0 10px 0; }
  .right-col .nota { font-size: 10.5px; font-style: italic; color: #5B6B7A; margin-top: 10px; }
  .right-col .nota b { font-style: normal; color: #0A2149; }
`;

export function buildQuotationDocument(data) {
  const quotationPage = buildQuotationPage(data);
  const itineraryPages = buildItineraryPages(data.days, data.quotationNo);
  return `<!DOCTYPE html>
<html lang="ms"><head><meta charset="UTF-8"><title>${esc(data.customer)} - Quotation ${esc(data.quotationNo)}</title>
<style>${STYLE}</style></head>
<body>${quotationPage}${itineraryPages}</body></html>`;
}
