const {
  searchPharmacyMedicines,
  getPharmacyMedicine,
  createPharmacyOrder,
  getPharmacyOrderStatus,
  searchLabTests,
  getLabTest,
  createLabBooking,
  trackLabBooking,
  checkInteractions,
} = require("./assistantActions");

// ============================================================
// 1. EMERGENCY SAFETY PRE-CHECK
// ============================================================

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "heart attack",
  "can't breathe",
  "cannot breathe",
  "difficulty breathing",
  "shortness of breath",
  "choking",
  "severe bleeding",
  "coughing blood",
  "vomiting blood",
  "unconscious",
  "loss of consciousness",
  "passed out",
  "seizure",
  "stroke",
  "facial drooping",
  "sudden numbness",
  "paralysis",
  "anaphylaxis",
  "severe allergic reaction",
  "poisoning",
  "head injury",
  "severe trauma",
  "seene me dard",
  "seene mein dard",
  "dil ka daura",
  "sans nahi arahi",
  "sans phool rahi",
  "khoon nikal raha",
  "behosh",
  "chakkar aakar gir",
];

function checkEmergency(message, language = "english") {
  const text = String(message || "").toLowerCase();
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => text.includes(kw));

  if (!isEmergency) return null;

  if (language === "urdu") {
    return `🚨 **ہنگامی الرٹ (Emergency Alert)**
آپ کی بیان کردہ علامات فوری طبی امداد کی متقاضی ہو سکتی ہیں۔
براہِ کرم فوری طور پر سٹی کیئر ہسپتال کے ایمرجنسی وارڈ تشریف لائیں یا ریسکیو 1122 پر کال کریں۔
ہمارا ایمرجنسی ٹراما سینٹر 24/7 کھلا ہے۔`;
  }

  if (language === "roman_urdu") {
    return `🚨 **Emergency Alert**
Aap ki batayi hui symptoms fori emergency medical care require karti hain.
Barah-e-karam bila-takeer City Care Hospital ke Emergency Department tashreef layein ya foran Emergency Helpline (1122) par rabta karein.
Hamara Emergency Trauma Center 24/7 on-duty hai.`;
  }

  return `🚨 **Medical Emergency Alert**
The symptoms described indicate a potentially critical or life-threatening situation.
Please proceed immediately to the **City Care Hospital Emergency & Trauma Center (Ground Floor)** or call emergency services (**1122** or local ambulance).
Our acute trauma team and consultant cardiologists/surgeons are on-duty 24/7.`;
}

// ============================================================
// 2. PRESCRIPTION & DOSAGE DENIAL GUARDRAIL
// ============================================================

const DOSAGE_PATTERNS = [
  /\b(how many (tablets|pills|capsules|doses|mg))\b/i,
  /\b(what dosage|what dose|recommend dosage|recommend dose)\b/i,
  /\b(how much should i take|how often should i take)\b/i,
  /\b(prescribe me|prescribe medicine|give me prescription)\b/i,
  /\b(kitni goli|kitne mg|dawa likh|kitni bar khani)\b/i,
];

function checkPrescriptionDosageDenial(message, language = "english") {
  const text = String(message || "").toLowerCase();

  // Commercial pharmacy purchases must NEVER be blocked as medical dosage advice
  if (
    /\b(order|buy|purchase|want|need|send me|give me|chahiye|khareedna|khareedni|mangwani|mangwana|detail|details)\b/i.test(text)
  ) {
    return null;
  }

  const isDosageQuery = DOSAGE_PATTERNS.some((pattern) => pattern.test(text));

  if (!isDosageQuery) return null;

  if (language === "urdu") {
    return `⚠️ **طبی حفاظتی رہنمائی (Medical Safety Notice)**
بطور AI ہیلتھ اسسٹنٹ، میں کوئی دوا تجویز (prescribe) نہیں کر سکتا اور نہ ہی مخصوص خوراک (dosage)، گولیوں کی تعداد یا اوقات بتانے کا مجاز ہوں۔
براہِ کرم دوا کے پیکٹ پر دی گئی ہدایات پڑھیں یا مستند ڈاکٹر یا ہسپتال کے فارماسسٹ سے رجوع کریں۔`;
  }

  if (language === "roman_urdu") {
    return `⚠️ **Medical Safety Notice**
Main AI Health Assistant hoon, main koi prescription medicine prescribe nahi kar sakta aur na hi specific dosage, goli ki tadad ya frequency recommend kar sakta hoon.
Please medicine ke packaging par likhi instructions follow karein ya hospital ke qualified doctor ya pharmacist se consult karein.`;
  }

  return `⚠️ **Medical Safety Guardrail**
As an AI Health Assistant, I cannot prescribe prescription-only medications, nor can I recommend specific dosages, tablet counts, or dosing frequencies.
Medication regimens must be personalized by a healthcare professional. Please follow the instructions on your prescription/product packaging or consult a licensed physician or hospital pharmacist.`;
}

// ============================================================
// 3. MEDICINE INTERACTION RETRIEVAL
// ============================================================

const INTERACTION_PATTERNS = [
  /\b(take .* with .*|taking .* with .*|together|combine .* and|interaction between|interact(?:ion)? with|safe to take .* with|mix .* and)\b/i,
  /\b(taking|take|using|use|on)\s+.+\s+(and|with)\s+.+\b/i,
  /\b(can i|can we|should i|is it safe|is .* safe|are .* safe).*\b(with|and|together)\b/i,
  /\b(sath le sakte|ek sath|aik sath|le sakte hain|saath le sakta|saath lena|mil kar|ikathay)\b/i,
];

function isInteractionQuery(message) {
  const text = String(message || "").toLowerCase();
  if (INTERACTION_PATTERNS.some((p) => p.test(text))) {
    return true;
  }
  try {
    const { identifyClasses } = require("./interactionChecker");
    if (identifyClasses && identifyClasses(text).length >= 2) {
      return true;
    }
  } catch {}
  return false;
}

function handleMedicineInteraction(message, language = "english") {
  const result = checkInteractions({ drugs: message });

  let out = "";
  if (result.hasInteraction) {
    out += `⚠️ **${result.summary}**\n\n`;
    out += `**Reference Guide:** [${result.sourceCitation}](${result.sourceUrl})\n\n`;

    result.interactions.forEach((item, idx) => {
      const icon = item.severity === "danger" ? "🛑" : "⚠️";
      out += `${icon} **Interaction ${idx + 1}: ${item.risk}**\n`;
      out += `• **Clinical Details:** ${item.details}\n`;
      out += `• **Documented in:** ${item.source}\n\n`;
    });

    out += `**Advisory:** ${result.recommendation}`;
  } else {
    out += `ℹ️ **Drug-Drug Interaction Check**\n\n`;
    out += `${result.summary}\n\n`;
    out += `**Reference Source:** ${result.sourceCitation}\n`;
    out += `**Advisory:** ${result.recommendation}`;
  }

  return out;
}

// ============================================================
// HELPER: NATURAL DATE, EMAIL, AND PHONE PARSER
// ============================================================

function parseNaturalDate(str) {
  if (!str) return null;
  const s = String(str).trim();

  // Check today / tomorrow / day after tomorrow
  if (/\btoday\b/i.test(s) || /^today$/i.test(s)) {
    return new Date().toISOString().slice(0, 10);
  }
  if (/\btomorrow\b/i.test(s) || /^tomorrow$/i.test(s)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/day after tomorrow/i.test(s)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }

  // ISO: YYYY-MM-DD
  const isoMatch = s.match(/\b(202[5-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/);
  if (isoMatch) return isoMatch[1];

  // Slash/Dash: DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = s.match(/\b([0-2]?\d|3[01])[/-](0?[1-9]|1[0-2])[/-](202[5-9])\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // English: 13 September 2026, 13th September 2026, Sep 13 2026, 13 September
  const monthMap = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  const naturalMatch = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*(202[5-9]))?\b/i);
  if (naturalMatch) {
    const day = naturalMatch[1].padStart(2, "0");
    const month = monthMap[naturalMatch[2].toLowerCase().slice(0, 3)] || "01";
    const year = naturalMatch[3] || String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  const naturalMonthFirst = s.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(202[5-9]))?\b/i);
  if (naturalMonthFirst) {
    const month = monthMap[naturalMonthFirst[1].toLowerCase().slice(0, 3)] || "01";
    const day = naturalMonthFirst[2].padStart(2, "0");
    const year = naturalMonthFirst[3] || String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  return null;
}

function extractEmail(text) {
  const match = String(text || "").match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const match = String(text || "").match(/(?:(?:\+?92|0092|0)?\s*[3]\d{2}[\s-]?\d{7}|\+?\d{10,14})/);
  return match ? match[0].replace(/\s+/g, "") : null;
}

// ============================================================
// 4. PHARMACY ACTIONS & ORDER FLOW
// ============================================================

const PHARMACY_ORDER_START_PATTERNS = [
  /\b(order|buy|purchase|want|need|send me|give me|can i have|want to buy|want to purchase|want to order|mangwani|chahiye|khareedna|khareedni|lena hai|layna hai)\b/i,
  /\b(order medicine|buy medicine|purchase medicine|home delivery|cash on delivery|cod delivery)\b/i,
  /\b(dawa mangwani|medicine mangwani|order karna|dawa chahiye|medicine chahiye)\b/i,
  /\b(same detail|same details|earlier detail|previous detail)\b/i,
];

const PHARMACY_SEARCH_PATTERNS = [
  /\b(do you have|is .* in stock|stock of|availability of|price of|how much is|cost of|list medicines|show medicines|catalog|available medicines|medicines available|which medicines|what medicines|online pharmacy|pharmacy medicines|medicines present|medicines are present|medicines in pharmacy)\b/i,
  /\b(dawa available hai|dawai available hai|kon si dawa|kaun si dawa|kon si medicines|kaun si medicines|dawaiyan available|dawa available|stock hai|keemat kitni|price kya hai|dawaon ki list|dawaiyon ki list|medicines ki list)\b/i,
  /\b(which medications|what medications|medications available|medications in stock|medications list)\b/i,
];

const PHARMACY_TRACK_PATTERNS = [
  /\b(track order|order status|order code|track.*ord-)\b/i,
  /\bORD-\d{8}-\d{4,6}\b/i,
  /\bORD-[A-Z0-9-]+\b/i,
];

function isPharmacyOrderStart(message) {
  return PHARMACY_ORDER_START_PATTERNS.some((p) => p.test(message));
}

function isPharmacySearch(message) {
  return PHARMACY_SEARCH_PATTERNS.some((p) => p.test(message));
}

function isPharmacyTrack(message) {
  return PHARMACY_TRACK_PATTERNS.some((p) => p.test(message));
}

async function handlePharmacyFlow(pool, session, message, language = "english") {
  const text = String(message || "").trim();

  // A. Cancellation
  if (session.pharmacyOrder && /^(cancel|stop|nahin|nahi|no|exit)$/i.test(text)) {
    session.pharmacyOrder = null;
    return "Your pharmacy order request has been cancelled. Let me know if you need help with anything else.";
  }

  // B. Tracking lookup
  if (isPharmacyTrack(text)) {
    const codeMatch = text.match(/ORD-[A-Z0-9-]+/i);
    const code = codeMatch ? codeMatch[0] : "";
    const phone = extractPhone(text) || "";

    const order = await getPharmacyOrderStatus(pool, { orderCode: code, phone });
    if (!order) {
      return `I could not find an online pharmacy order matching "${code || phone || text}". Please verify your order code (e.g. ORD-YYYYMMDD-XXXX) or contact our pharmacy desk.`;
    }

    let reply = `📦 **Pharmacy Order Tracking: ${order.order_code}**\n\n`;
    reply += `• **Customer Name:** ${order.customer_name}\n`;
    reply += `• **Delivery Address:** ${order.delivery_address}\n`;
    reply += `• **Order Status:** **${order.status.toUpperCase()}**\n`;
    reply += `• **Payment:** Cash on Delivery (COD)\n`;
    reply += `• **Total Amount:** Rs. ${Number(order.total_amount).toLocaleString()}\n`;
    if (order.items && order.items.length) {
      reply += `\n**Ordered Items:**\n`;
      order.items.forEach((item) => {
        reply += `• ${item.quantity}x ${item.medicine_name} (Rs. ${Number(item.unit_price).toLocaleString()} each)\n`;
      });
    }
    return reply;
  }

  // C. In-progress order multi-turn continuation
  if (session.pharmacyOrder) {
    const order = session.pharmacyOrder;

    // Extract any new email, phone, address, or name provided
    const email = extractEmail(text);
    if (email && !order.customer_email) order.customer_email = email;

    const phone = extractPhone(text);
    if (phone && !order.customer_phone) order.customer_phone = phone;

    // Extract delivery address if explicitly prefixed
    const addressPrefixMatch = text.match(/(?:delivery\s*address|deliver\s*to|shipping\s*address)\s*(?:is|:)?\s*([^.]+?)(?:\s*(?:and\s+)?(?:email|phone|contact|name|patient)|\n|$)/i);
    if (addressPrefixMatch && !order.delivery_address) {
      order.delivery_address = addressPrefixMatch[1].trim();
    }

    // Split text to extract address and name if not set
    const cleanForParts = text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "")
      .replace(/(?:(?:\+?92|0092|0)?\s*[3]\d{2}[\s-]?\d{7}|\+?\d{10,14})/g, "");
    const parts = cleanForParts.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (
        !order.delivery_address &&
        !/\b(want|order|purchase|buy|need|same detail|earlier|previous|send me|give me)\b/i.test(part) &&
        (/\b(street|road|house|sector|block|apt|flat|phase|colony|near|st\.|h#|r#|floor|gali|makan)\b/i.test(part) ||
          (part.length > 20 && /\d/.test(part)))
      ) {
        order.delivery_address = part;
      } else if (!order.customer_name && part.length >= 2 && part.length <= 40 && !/\d/.test(part) && !/yes|confirm|ok|order|buy/i.test(part)) {
        order.customer_name = part;
      }
    }

    // If confirmation word given and all details present
    if (order.customer_name && order.customer_phone && order.delivery_address && order.customer_email) {
      try {
        const placed = await createPharmacyOrder(pool, {
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_email: order.customer_email,
          delivery_address: order.delivery_address,
          notes: order.notes || "Ordered via AI Assistant",
          items: order.items,
        });

        session.pharmacyOrder = null;

        let reply = `✅ **Online Pharmacy Order Placed & Confirmed!**\n\n`;
        reply += `• **Order Tracking Code:** ${placed.order_code}\n`;
        reply += `• **Recipient:** ${placed.customer_name} (${placed.customer_phone})\n`;
        reply += `• **Confirmation Email:** ${placed.customer_email || "Sent"}\n`;
        reply += `• **Delivery Address:** ${placed.delivery_address}\n`;
        reply += `• **Payment Mode:** Cash on Delivery (COD)\n`;
        reply += `• **Total Payable:** Rs. ${placed.total_amount.toLocaleString()}\n\n`;
        reply += `**Items in Package:**\n`;
        placed.items.forEach((it) => {
          reply += `• ${it.quantity}x ${it.medicine_name} — Rs. ${Number(it.line_total).toLocaleString()}\n`;
        });
        reply += `\nOur hospital pharmacy team has received your confirmed order and is preparing it for dispatch. A confirmation receipt has been sent to ${placed.customer_email}.`;
        return reply;
      } catch (err) {
        return `Failed to place order: ${err.message}. Would you like to adjust your details?`;
      }
    }

    // Step-by-step missing prompts
    if (!order.customer_name) {
      return "Thank you! Could you please provide the **Full Name** of the recipient for the pharmacy order?";
    }
    if (!order.customer_phone) {
      return `Thank you, ${order.customer_name}. What is your **contact phone number** for delivery coordination?`;
    }
    if (!order.customer_email) {
      return "Please share your **email address** so we can send the order receipt and tracking updates.";
    }
    if (!order.delivery_address) {
      return "Please provide your complete **doorstep delivery address** for courier dispatch.";
    }
  }

  // D. Start new pharmacy order
  if (isPharmacyOrderStart(text)) {
    // Search medicines in database
    const catalog = await searchPharmacyMedicines(pool);

    // Look for medicine matches
    const matchedItems = [];
    for (const med of catalog) {
      const cleanMed = med.name.toLowerCase().replace(/\(.*\)/g, "").trim();
      const rawMed = med.name.toLowerCase();
      // Match if text contains the medicine name or its primary word
      const primaryWord = cleanMed.split(" ")[0];
      if (
        text.toLowerCase().includes(rawMed) ||
        text.toLowerCase().includes(cleanMed) ||
        (primaryWord.length > 3 && new RegExp(`\\b${primaryWord}\\b`, "i").test(text))
      ) {
        if (!matchedItems.some((m) => m.medicine_id === med.id)) {
          // Extract quantity if mentioned (e.g. 2 cetirizine, 3 strips)
          const qMatch = text.match(new RegExp(`(\\d+)\\s*(?:x|strips?|tablets?|boxes?|packs?|units?)?\\s*${primaryWord}`, "i")) ||
                         text.match(new RegExp(`${primaryWord}\\s*(\\d+)`, "i")) ||
                         text.match(/\b(\d+)\s*(?:tablets?|strips?|packs?|boxes?)\b/i);
          const qty = qMatch ? Math.max(1, parseInt(qMatch[1], 10)) : 1;

          matchedItems.push({
            medicine_id: med.id,
            medicine_name: med.name,
            quantity: qty,
            unit_price: Number(med.unit_price),
            line_total: qty * Number(med.unit_price),
            stock_quantity: med.stock_quantity,
          });
        }
      }
    }

    if (matchedItems.length === 0) {
      // User says "I want to purchase..." but medicine not recognized in text
      const cleanTerm = text
        .replace(/[?.,!]/g, "")
        .replace(/\b(i want to|want to|order|buy|purchase|mangwani|chahiye|khareedna|medicine|dawa|tablets?)\b/gi, "")
        .trim();
      if (cleanTerm && cleanTerm.length > 2) {
        const directSearch = await searchPharmacyMedicines(pool, { query: cleanTerm });
        if (directSearch.length > 0) {
          const med = directSearch[0];
          matchedItems.push({
            medicine_id: med.id,
            medicine_name: med.name,
            quantity: 1,
            unit_price: Number(med.unit_price),
            line_total: Number(med.unit_price),
            stock_quantity: med.stock_quantity,
          });
        }
      }
    }

    if (matchedItems.length === 0) {
      return "I can assist you in ordering any in-stock medicine from our 24/7 central pharmacy for Cash on Delivery (COD) doorstep delivery. Which medication would you like to purchase? (For example: *'Purchase Cetirizine 10mg'* or *'Order 2 Panadol 500mg'*)";
    }

    // Check stock
    const outOfStock = matchedItems.filter((it) => it.stock_quantity <= 0);
    if (outOfStock.length > 0) {
      return `⚠️ We apologize, but **${outOfStock.map((it) => it.medicine_name).join(", ")}** is currently out of stock in our central inventory. Please check back soon or consult our pharmacist for available therapeutic alternatives.`;
    }

    // Extract any details in the current message
    const email = extractEmail(text);
    const phone = extractPhone(text);
    let address = null;
    let name = null;

    const addressPrefixMatch = text.match(/(?:delivery\s*address|deliver\s*to|shipping\s*address)\s*(?:is|:)?\s*([^.]+?)(?:\s*(?:and\s+)?(?:email|phone|contact|name|patient)|\n|$)/i);
    if (addressPrefixMatch) {
      address = addressPrefixMatch[1].trim();
    }

    const cleanForParts = text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "")
      .replace(/(?:(?:\+?92|0092|0)?\s*[3]\d{2}[\s-]?\d{7}|\+?\d{10,14})/g, "");
    const parts = cleanForParts.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (
        !address &&
        !/\b(want|order|purchase|buy|need|same detail|earlier|previous|send me|give me)\b/i.test(part) &&
        (/\b(street|road|house|sector|block|apt|flat|phase|colony|near|st\.|h#|r#|floor|gali|makan)\b/i.test(part) ||
          (part.length > 20 && /\d/.test(part)))
      ) {
        address = part;
      } else if (!name && part.length >= 2 && part.length <= 40 && !/\d/.test(part) && !/order|buy|purchase|cetirizine|panadol|amoxicillin|same|detail|want|need/i.test(part)) {
        name = part;
      }
    }

    // Inherit from session memory if not supplied in this turn (e.g. "same detail which I sent you earlier")
    const profile = session.customerProfile || {};
    const lab = session.labBooking || {};
    const doc = session.booking || {};

    const resolvedName = name || profile.name || lab.patient_name || doc.patient_name || null;
    const resolvedPhone = phone || profile.phone || lab.patient_phone || doc.patient_phone || null;
    const resolvedEmail = email || profile.email || lab.patient_email || doc.patient_email || null;
    const resolvedAddress = address || profile.address || lab.home_address || null;

    // Update session.customerProfile
    session.customerProfile = {
      name: resolvedName,
      phone: resolvedPhone,
      email: resolvedEmail,
      address: resolvedAddress,
    };

    session.pharmacyOrder = {
      items: matchedItems,
      customer_name: resolvedName,
      customer_phone: resolvedPhone,
      customer_email: resolvedEmail,
      delivery_address: resolvedAddress,
      notes: "Ordered via AI Assistant",
      awaitingConfirmation: false,
    };

    // If all required customer details are already known, proceed directly to placement
    if (resolvedName && resolvedPhone && resolvedEmail && resolvedAddress) {
      return handlePharmacyFlow(pool, session, "confirm", language);
    }

    let reply = `I found the following item in our central pharmacy inventory:\n\n`;
    matchedItems.forEach((it) => {
      reply += `• **${it.medicine_name}** — Rs. ${it.unit_price.toLocaleString()} each (Quantity: ${it.quantity})\n`;
    });
    reply += `• **Payment:** Cash on Delivery (COD)\n\n`;

    // Prompt for only missing fields
    if (!resolvedName) {
      reply += "To proceed with home delivery, please provide the **Recipient's Full Name**.";
    } else if (!resolvedPhone) {
      reply += `Thank you, ${resolvedName}. What is your **contact phone number**?`;
    } else if (!resolvedEmail) {
      reply += "Please share your **email address** for electronic receipt delivery.";
    } else if (!resolvedAddress) {
      reply += "Please provide your **complete doorstep delivery address**.";
    }

    return reply;
  }

  // E. Pharmacy search / catalog inquiries
  if (isPharmacySearch(text)) {
    const isGeneralCatalog =
      /\b(catalog|list medicines|show medicines|available medicines|medicines available|which medicines|what medicines|online pharmacy|pharmacy medicines|all medicines)\b/i.test(
        text
      ) ||
      /^(which|what|list|show)?\s*(medicines?|medications?|drugs?|dawa|dawai)?\s*(are|is)?\s*(available|present|in stock)?\s*(in|at)?\s*(the)?\s*(pharmacy|store)?$/i.test(
        text.trim()
      );

    let cleanTerm = "";
    if (!isGeneralCatalog) {
      cleanTerm = text
        .replace(/[?.,!]/g, "")
        .replace(
          /\b(do you have|is|are|in stock|stock of|availability of|price of|how much is|cost of|what is the price of|keemat|price kya hai|please|can you|tell me|what|which|any|medicines?|medications?|drugs?|tablets?|syrups?|in pharmacy|available|present)\b/gi,
          ""
        )
        .trim();
    }

    if (!cleanTerm || /^(medicines?|drugs?|medications?|dawa|dawai|pharmacy|store)$/i.test(cleanTerm)) {
      cleanTerm = "";
    }

    const results = await searchPharmacyMedicines(pool, { query: cleanTerm });
    if (results.length === 0) {
      return `I couldn't find any medications matching "${cleanTerm}" in our central pharmacy inventory. Please feel free to visit our Online Pharmacy page or ask our 24/7 ground-floor pharmacy counter.`;
    }

    let reply = "";
    if (!cleanTerm) {
      reply = `💊 **City Care Hospital Pharmacy Inventory:**\n`;
      reply += `Our central pharmacy is open **24/7 on the Ground Floor (OPD)** for walk-in dispensing. Doorstep **Cash on Delivery (COD)** home delivery is also available!\n\n`;
      reply += `**Available In-Stock Medications (${results.length} items):**\n\n`;
    } else {
      reply = `💊 **Pharmacy Search Results for "${cleanTerm}" (${results.length} found):**\n\n`;
    }

    results.slice(0, 10).forEach((med) => {
      let badge = "🟢 In Stock";
      if (med.stock_status === "out_of_stock") badge = "🔴 Out of Stock";
      else if (med.stock_status === "low_stock") badge = `🟡 Low Stock (${med.stock_quantity} left)`;

      reply += `• **${med.name}** (${med.category})\n`;
      reply += `  Price: Rs. ${Number(med.unit_price).toLocaleString()} | Status: ${badge}\n`;
    });

    if (results.length > 10) {
      reply += `\n*Showing top 10 items. Visit our Online Pharmacy for the complete catalog.*`;
    }
    reply += `\nTo purchase any medicine for home delivery, simply say e.g., *"I want to purchase ${results[0].name}"*.`;
    return reply;
  }

  return null;
}

// ============================================================
// 5. LABORATORY ACTIONS & BOOKING FLOW
// ============================================================

const LAB_TRACK_PATTERNS = [
  /\b(track lab|track test|lab results?|lab tracking|check my lab report|check lab report|check lab)\b/i,
  /\bLAB-\d{4}-\d{6}\b/i,
  /\bLB-[A-Z0-9-]+\b/i,
];

const LAB_BOOKING_START_PATTERNS = [
  /\b(book|schedule|reserve)\b.*\b(lab|test|blood|cbc|lipid|urine|lft|rft|profile|biochemistry|culture|glucose|count)\b/i,
  /\b(book lab|book blood test|book test|schedule lab|home blood collection|home sample collection|lab appointment)\b/i,
  /\b(test book karna|blood test karwana|lab test schedule)\b/i,
];

const LAB_SEARCH_PATTERNS = [
  /\b(what lab tests|which lab tests|what tests|which tests|list lab tests|list tests|show lab tests|show tests|available lab tests|available tests|all tests|lab catalog|test catalog|lab test prices?|cost of .* test|how much is .* test|turnaround time|lab tests?|laboratory tests?)\b/i,
  /\b(lab test kitne ka hai|test available hai|lab ke tests|tests available|tests present|what tests do you have|which tests do you have|tests in lab)\b/i,
  /\b(how much is (cbc|lipid|glucose|sugar|lft|rft|urine|blood count|thyroid|xray|ecg|ultrasound))\b/i,
  /\b(cost of (cbc|lipid|glucose|sugar|lft|rft|urine|blood count|thyroid|xray|ecg|ultrasound))\b/i,
  /\b(price of (cbc|lipid|glucose|sugar|lft|rft|urine|blood count|thyroid|xray|ecg|ultrasound))\b/i,
];

function isLabTrack(message) {
  return LAB_TRACK_PATTERNS.some((p) => p.test(message));
}

function isLabBookingStart(message) {
  return LAB_BOOKING_START_PATTERNS.some((p) => p.test(message));
}

function isLabSearch(message) {
  return LAB_SEARCH_PATTERNS.some((p) => p.test(message));
}

async function handleLabFlow(pool, session, message, language = "english") {
  const text = String(message || "").trim();

  // A. Cancellation
  if (session.labBooking && /^(cancel|stop|nahin|nahi|no|exit)$/i.test(text)) {
    session.labBooking = null;
    return "Your laboratory booking request has been cancelled. Please let me know if you need anything else.";
  }

  // B. Tracking lookup
  if (isLabTrack(text)) {
    const codeMatch = text.match(/(LAB-d{4}-d{6}|LB-[A-Z0-9-]+)/i);
    const code = codeMatch ? codeMatch[0] : "";

    const labRecord = await trackLabBooking(pool, { trackingId: code });
    if (!labRecord) {
      return `No laboratory record was found for tracking ID "${code || text}". Please verify the code on your token slip (e.g. LAB-YYYY-XXXXXX).`;
    }

    let reply = `🧪 **Laboratory Booking & Diagnostic Report**\n\n`;
    reply += `• **Tracking ID:** ${labRecord.tracking_id}\n`;
    reply += `• **Patient Name:** ${labRecord.patient_name}\n`;
    reply += `• **Service Mode:** ${labRecord.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Laboratory"}\n`;
    reply += `• **Booking Date:** ${new Date(labRecord.booking_date).toISOString().slice(0, 10)}\n`;
    reply += `• **Overall Status:** **${labRecord.status.replace(/_/g, " ").toUpperCase()}**\n\n`;

    if (labRecord.items && labRecord.items.length) {
      reply += `**Diagnostic Test Findings:**\n`;
      labRecord.items.forEach((item) => {
        reply += `• **${item.test_name}**\n`;
        if (item.result_status === "completed" || item.result_value) {
          reply += `  - Measured Result: **${item.result_value || "Normal / Negative"}** ${item.unit || ""}\n`;
          reply += `  - Reference Range: ${item.normal_range || "N/A"}\n`;
          reply += `  - Verification Status: **VERIFIED & RELEASED**\n`;
          if (item.remarks) reply += `  - Clinical Remarks: ${item.remarks}\n`;
        } else {
          reply += `  - Sample Status: *Sample Received in Laboratory*\n`;
          reply += `  - Result Status: *Diagnostic Analysis in Progress — Awaiting Pathologist Verification*\n`;
        }
      });
    }
    return reply;
  }

  // C. In-progress lab booking multi-turn continuation
  if (session.labBooking) {
    const booking = session.labBooking;

    // Check confirmation first
    if (booking.awaitingConfirmation) {
      if (/^(yes|confirm|ha|haan|ok|okay|proceed)$/i.test(text.trim())) {
        try {
          const created = await createLabBooking(pool, {
            patient_name: booking.patient_name,
            patient_phone: booking.patient_phone,
            patient_email: booking.patient_email || null,
            patient_age: booking.patient_age || null,
            patient_gender: booking.patient_gender || null,
            service_type: booking.service_type,
            booking_date: booking.booking_date,
            booking_time: booking.booking_time || null,
            home_address: booking.home_address || null,
            notes: booking.notes || "Booked via AI Assistant",
            test_ids: booking.tests.map((t) => t.id),
          });

          session.labBooking = null;

          let reply = `✅ **Laboratory Appointment Confirmed!**\n\n`;
          reply += `• **Laboratory Tracking ID:** ${created.tracking_id}\n`;
          reply += `• **Booking Reference:** ${created.booking_code}\n`;
          reply += `• **Patient:** ${created.patient_name} (${created.patient_phone})\n`;
          if (created.patient_email) reply += `• **Confirmation Email:** ${created.patient_email}\n`;
          reply += `• **Service Mode:** ${created.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Laboratory"}\n`;
          reply += `• **Scheduled Date:** ${new Date(created.booking_date).toISOString().slice(0, 10)}\n`;
          reply += `• **Total Amount:** Rs. ${Number(created.total_amount).toLocaleString()}\n\n`;
          reply += `**Selected Tests:**\n`;
          created.tests.forEach((t) => {
            reply += `• ${t.name} (Rs. ${Number(t.price).toLocaleString()})\n`;
          });
          reply += `\n**Instructions:**\n`;
          reply += `• Please quote your Tracking ID ${created.tracking_id} at the laboratory desk or online tracking.\n`;
          reply += `• For fasting tests (e.g. Lipid, Fasting Blood Sugar), 8–12 hours overnight fasting is advised.\n`;
          return reply;
        } catch (err) {
          return `Failed to register laboratory booking: ${err.message}. Would you like to adjust the booking details?`;
        }
      } else if (/^(no|cancel|stop|nahin|nahi)$/i.test(text.trim())) {
        session.labBooking = null;
        return "Your laboratory booking has been cancelled.";
      }
    }

    // Extract newly supplied information
    const dateVal = parseNaturalDate(text);
    if (dateVal && !booking.booking_date) booking.booking_date = dateVal;

    const phoneVal = extractPhone(text);
    if (phoneVal && !booking.patient_phone) booking.patient_phone = phoneVal;

    const emailVal = extractEmail(text);
    if (emailVal && !booking.patient_email) booking.patient_email = emailVal;

    if (/\b(home|doorstep|ghr)\b/i.test(text)) {
      booking.service_type = "home_service";
    } else if (/\b(clinic|hospital|in-clinic|walk-in)\b/i.test(text)) {
      booking.service_type = "in_clinic";
    }

    // Split text to extract address and name
    const parts = text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (parseNaturalDate(part) || extractPhone(part) || extractEmail(part)) continue;

      if (/\b(street|road|house|sector|block|apt|flat|phase|colony|near|st\.|h#|r#)\b/i.test(part) || part.length > 18) {
        if (!booking.home_address) booking.home_address = part;
      } else if (!booking.patient_name && part.length >= 2 && part.length <= 40 && !/\d/.test(part) && !/in clinic|home|yes|confirm|book|test/i.test(part)) {
        booking.patient_name = part;
      }
    }

    // Sync to session.customerProfile
    session.customerProfile = session.customerProfile || {};
    if (booking.patient_name) session.customerProfile.name = booking.patient_name;
    if (booking.patient_phone) session.customerProfile.phone = booking.patient_phone;
    if (booking.patient_email) session.customerProfile.email = booking.patient_email;
    if (booking.home_address) session.customerProfile.address = booking.home_address;

    // Validate home collection capability
    if (booking.service_type === "home_service") {
      const unsupported = booking.tests.filter((t) => !t.is_home_collection_available);
      if (unsupported.length > 0) {
        booking.service_type = "in_clinic";
        return `⚠️ Notice: Home sample collection is not available for: ${unsupported.map((t) => t.name).join(", ")}. These tests require in-clinic hospital equipment. Would you like to proceed as an **In-Clinic** lab appointment? (Yes / No)`;
      }
    }

    // Inspect session state: Only prompt for genuinely missing information
    if (!booking.patient_name) {
      return "Please provide the **Patient's Full Name** for the laboratory booking.";
    }
    if (!booking.patient_phone) {
      return `Thank you, ${booking.patient_name}. What is your **contact phone number**?`;
    }
    if (!booking.booking_date) {
      return "What **date** would you like to schedule the laboratory test? (e.g. tomorrow or 13 September 2026)";
    }
    if (!booking.patient_email) {
      return "Please provide your **email address** so we can send your digital lab report and tracking slip.";
    }
    if (booking.service_type === "home_service" && !booking.home_address) {
      return "Please provide your **complete home address** for our phlebotomist team to collect the sample.";
    }

    // All collected -> prompt confirmation
    booking.awaitingConfirmation = true;
    const total = booking.tests.reduce((sum, t) => sum + Number(t.price), 0);

    let conf = `📋 **Laboratory Appointment Summary:**\n\n`;
    conf += `• **Patient Name:** ${booking.patient_name}\n`;
    conf += `• **Phone:** ${booking.patient_phone}\n`;
    conf += `• **Email:** ${booking.patient_email}\n`;
    conf += `• **Scheduled Date:** ${booking.booking_date}\n`;
    conf += `• **Service Mode:** ${booking.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Laboratory"}\n`;
    if (booking.home_address) conf += `• **Collection Address:** ${booking.home_address}\n`;
    conf += `• **Total Amount:** Rs. ${total.toLocaleString()}\n\n`;
    conf += `**Selected Tests:**\n`;
    booking.tests.forEach((t) => {
      conf += `• ${t.name} (Rs. ${Number(t.price).toLocaleString()})\n`;
    });
    conf += `\nWould you like me to confirm this laboratory booking? (Reply **Yes** to confirm or **Cancel** to abort)`;
    return conf;
  }

  // D. Start new lab booking
  if (isLabBookingStart(text)) {
    const allTests = await searchLabTests(pool);
    const matched = [];

    // Match tests mentioned in text
    for (const test of allTests) {
      const cleanTestName = test.name.replace(/\(.*\)/g, "").trim().toLowerCase();
      const rawTestName = test.name.toLowerCase();
      if (
        text.toLowerCase().includes(rawTestName) ||
        text.toLowerCase().includes(cleanTestName) ||
        (test.test_code && text.toLowerCase().includes(test.test_code.toLowerCase()))
      ) {
        if (!matched.some((m) => m.id === test.id)) {
          matched.push(test);
        }
      }
    }

    // Common abbreviations
    if (matched.length === 0) {
      const keywords = [
        { term: "cbc", name: "Complete Blood Count" },
        { term: "blood count", name: "Complete Blood Count" },
        { term: "lipid", name: "Lipid Profile" },
        { term: "cholesterol", name: "Lipid Profile" },
        { term: "lft", name: "Liver Function Test" },
        { term: "liver", name: "Liver Function Test" },
        { term: "rft", name: "Renal Function Test" },
        { term: "kidney", name: "Renal Function Test" },
        { term: "glucose", name: "Fasting Blood Glucose" },
        { term: "sugar", name: "Fasting Blood Glucose" },
        { term: "urine", name: "Complete Urine Analysis" },
        { term: "x-ray", name: "Chest X-Ray" },
        { term: "xray", name: "Chest X-Ray" },
        { term: "ultrasound", name: "Abdominal Ultrasound" },
      ];

      for (const kw of keywords) {
        if (new RegExp(`\\b${kw.term}\\b`, "i").test(text)) {
          const t = allTests.find((x) => x.name.toLowerCase().includes(kw.name.toLowerCase()));
          if (t && !matched.some((m) => m.id === t.id)) {
            matched.push(t);
          }
        }
      }
    }

    if (matched.length === 0) {
      return "I can help you book an in-clinic laboratory test or schedule home sample collection. Which lab test or blood work would you like to book? (For example: *'Book Complete Blood Count'* or *'Schedule Lipid Profile'*).";
    }

    const isHome = /home|doorstep|ghr/i.test(text);

    // Extract any details already present in the booking sentence
    const dateVal = parseNaturalDate(text);
    const phoneVal = extractPhone(text);
    const emailVal = extractEmail(text);

    const profile = session.customerProfile || {};
    const doc = session.booking || {};

    const resolvedName = profile.name || doc.patient_name || null;
    const resolvedPhone = phoneVal || profile.phone || doc.patient_phone || null;
    const resolvedEmail = emailVal || profile.email || doc.patient_email || null;
    const resolvedAddress = profile.address || null;

    session.labBooking = {
      tests: matched,
      service_type: isHome ? "home_service" : "in_clinic",
      patient_name: resolvedName,
      patient_phone: resolvedPhone,
      patient_email: resolvedEmail,
      booking_date: dateVal,
      home_address: resolvedAddress,
      awaitingConfirmation: false,
    };

    let reply = `I have selected the following test(s) from our laboratory catalog:\n\n`;
    matched.forEach((t) => {
      reply += `• **${t.name}** (Rs. ${Number(t.price).toLocaleString()}) — ${t.is_home_collection_available ? "🏠 Home Collection Available" : "🏥 In-Clinic Only"}\n`;
    });

    const missingPrompts = [];
    if (!isHome && !/clinic/i.test(text)) {
      missingPrompts.push("Would you prefer **In-Clinic** or **Home Sample Collection**?");
    }
    if (!resolvedName) {
      missingPrompts.push("Please provide the **Patient Full Name**.");
    }
    if (!dateVal) {
      missingPrompts.push("What **date** would you like to schedule? (e.g. tomorrow or 13 September 2026)");
    }
    if (!resolvedPhone) {
      missingPrompts.push("What is your **contact phone number**?");
    }

    if (missingPrompts.length > 0) {
      reply += `\n${missingPrompts.join(" ")}`;
    } else {
      // All present -> trigger confirmation prompt
      return handleLabFlow(pool, session, message, language);
    }
    return reply;
  }

  // E. Lab search / inquiries
  if (isLabSearch(text)) {
    const isGeneralLabCatalog =
      /\b(what lab tests|which lab tests|what tests|which tests|list lab tests|list tests|show lab tests|show tests|available lab tests|available tests|all tests|lab catalog|what tests do you have|which tests do you have|do you have lab tests|tests available|test catalog|lab ke tests|tests present)\b/i.test(
        text
      ) ||
      /^(which|what|list|show|all)?\s*(tests?|lab tests?|laboratory tests?|blood tests?)\s*(are|is)?\s*(present|available|offered|done)?\s*(in|at)?\s*(the)?\s*(lab|laboratory|hospital)?$/i.test(
        text.trim()
      );

    let cleanTerm = "";
    if (!isGeneralLabCatalog) {
      cleanTerm = text
        .replace(/[?.,!]/g, "")
        .replace(
          /\b(what lab tests|which lab tests|what tests|which tests|list lab tests|list tests|show lab tests|show tests|lab test prices?|cost of|price of|how much is|tests?|test|available lab tests|available tests|turnaround time|kitne ka hai|price kya hai|do you offer|can you do|do you have|show|what is the price of|tell me the price of)\b/gi,
          ""
        )
        .trim();
    }

    if (!cleanTerm || /^(tests?|lab tests?|laboratory tests?|lab|laboratory|all)$/i.test(cleanTerm)) {
      cleanTerm = "";
    }

    const results = await searchLabTests(pool, { query: cleanTerm });
    if (results.length === 0) {
      return `I couldn't find any laboratory tests matching "${cleanTerm}". We offer tests including Complete Blood Count (CBC), Lipid Profile, Fasting Blood Glucose, LFT, Renal Function, Digital Chest X-Ray, and Ultrasound.`;
    }

    let reply = "";
    if (!cleanTerm) {
      reply = `🧪 **City Care Diagnostic Laboratory Catalog (${results.length} tests available):**\n`;
      reply += `Our pathology laboratory provides clinical pathology, biochemistry, and diagnostic imaging with doorstep sample collection.\n\n`;
    } else {
      reply = `🧪 **Laboratory Tests for "${cleanTerm}" (${results.length} found):**\n\n`;
    }

    results.slice(0, 8).forEach((t) => {
      const homeBadge = t.is_home_collection_available ? "🏠 Home Collection Available" : "🏥 In-Clinic Only";
      reply += `• **${t.name}** (${t.category})\n`;
      reply += `  Code: ${t.test_code} | Price: Rs. ${Number(t.price).toLocaleString()} | Turnaround: ${t.turnaround_hours}h | ${homeBadge}\n`;
      if (t.normal_range) reply += `  Normal Range: ${t.normal_range} ${t.unit || ""}\n`;
    });

    if (results.length > 8) {
      reply += `\n*Showing top 8 tests. Please visit our Laboratory page for the complete list.*`;
    }
    reply += `\nTo book any test, simply reply e.g., *"Book ${results[0].name}"* or *"Schedule home collection for ${results[0].name}"*.`;
    return reply;
  }

  return null;
}

module.exports = {
  checkEmergency,
  checkPrescriptionDosageDenial,
  isInteractionQuery,
  handleMedicineInteraction,
  handlePharmacyFlow,
  handleLabFlow,
  parseNaturalDate,
  isPharmacyOrderStart,
  isPharmacySearch,
  isPharmacyTrack,
};
