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
  // Urdu / Roman Urdu
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
براہِ کرم فوری طور پر ریسکیو 1122 پر کال کریں یا قریبی ہسپتال کے **ایمرجنسی ڈیپارٹمنٹ** تشریف لے جائیں۔
اس صورتحال میں AI اسسٹنٹ کے مشورے کا انتظار نہ کریں۔`;
  }

  if (language === "roman_urdu") {
    return `🚨 **EMERGENCY ALERT**
Aap ki describe ki gayi symptoms serious emergency ho sakti hain.
Please foran Rescue 1122 par call karein ya qareebi Hospital ke **Emergency Department** tashreef le jayein.
Emergency situations mein chat assistant ke response ka intezar na karein.`;
  }

  return `🚨 **EMERGENCY MEDICAL ALERT**
The symptoms you have described may indicate a life-threatening medical emergency.
Please **immediately call emergency services (e.g. 1122 or 911)** or visit the nearest **Hospital Emergency Department**.
Do not rely on an AI assistant during a medical emergency.`;
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
  /\b(take .* with .*|together|combine .* and|interaction between|safe to take .* with|mix .* and)\b/i,
  /\b(sath le sakte|ek sath|aik sath|le sakte hain)\b/i,
];

function isInteractionQuery(message) {
  const text = String(message || "").toLowerCase();
  return INTERACTION_PATTERNS.some((p) => p.test(text));
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
// 4. PHARMACY ACTIONS & ORDER FLOW
// ============================================================

const PHARMACY_ORDER_START_PATTERNS = [
  /\b(order|buy|purchase)\b.*\b(panadol|paracetamol|amoxicillin|insulin|cough syrup|ibuprofen|aspirin|omeprazole|medicine|tablets?)\b/i,
  /\b(order medicine|buy medicine|purchase medicine|home delivery)\b/i,
  /\b(dawa mangwani|medicine mangwani|order karna)\b/i,
];

const PHARMACY_SEARCH_PATTERNS = [
  /\b(do you have|is .* in stock|stock of|availability of|price of|how much is|cost of|list medicines|show medicines|catalog|available medicines|medicines available|which medicines|what medicines|online pharmacy|pharmacy medicines)\b/i,
  /\b(dawa available hai|dawai available hai|kon si dawa|kaun si dawa|kon si medicines|kaun si medicines|dawaiyan available|dawa available|stock hai|keemat kitni|price kya hai)\b/i,
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
    const phoneMatch = text.match(/(\+?\d{10,13})/);
    const phone = phoneMatch ? phoneMatch[0] : "";

    const order = await getPharmacyOrderStatus(pool, { orderCode: code, phone });
    if (!order) {
      return `I could not find an online pharmacy order matching "${code || phone || text}". Please verify your order code (e.g. ORD-YYYYMMDD-XXXX) or contact our pharmacy desk.`;
    }

    let reply = `📦 **Pharmacy Order Tracking: ${order.order_code}**\n\n`;
    reply += `• **Customer Name:** ${order.customer_name}\n`;
    reply += `• **Delivery Address:** ${order.delivery_address}\n`;
    reply += `• **Status:** ${order.status.toUpperCase()}\n`;
    reply += `• **Payment:** Cash on Delivery (COD)\n`;
    reply += `• **Total Amount:** $${Number(order.total_amount).toFixed(2)}\n`;
    if (order.items && order.items.length) {
      reply += `\n**Ordered Items:**\n`;
      order.items.forEach((item) => {
        reply += `• ${item.quantity}x ${item.medicine_name} ($${Number(item.unit_price).toFixed(2)} each)\n`;
      });
    }
    return reply;
  }

  // C. In-progress order multi-turn continuation
  if (session.pharmacyOrder) {
    const order = session.pharmacyOrder;

    // Check for confirmation first
    if (order.awaitingConfirmation) {
      if (/^(yes|confirm|ha|haan|ok|okay|proceed|placed?)$/i.test(text.trim())) {
        try {
          const placed = await createPharmacyOrder(pool, {
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_email: order.customer_email || null,
            delivery_address: order.delivery_address,
            notes: order.notes || "Ordered via AI Assistant",
            items: order.items,
          });

          session.pharmacyOrder = null;

          let reply = `✅ **Online Pharmacy Order Placed Successfully!**\n\n`;
          reply += `• **Order Tracking Code:** \`${placed.order_code}\`\n`;
          reply += `• **Recipient:** ${placed.customer_name} (${placed.customer_phone})\n`;
          reply += `• **Delivery Address:** ${placed.delivery_address}\n`;
          reply += `• **Payment Mode:** Cash on Delivery (COD)\n`;
          reply += `• **Total Payable:** $${placed.total_amount.toFixed(2)}\n\n`;
          reply += `**Items in Package:**\n`;
          placed.items.forEach((it) => {
            reply += `• ${it.quantity}x ${it.medicine_name} - $${Number(it.line_total).toFixed(2)}\n`;
          });
          reply += `\nOur hospital pharmacy courier will deliver to your doorstep. Please have the cash payment ready upon delivery.`;
          return reply;
        } catch (err) {
          return `Failed to place order: ${err.message}. Would you like to adjust the order details?`;
        }
      } else if (/^(no|cancel|stop|nahin|nahi)$/i.test(text.trim())) {
        session.pharmacyOrder = null;
        return "Your pharmacy order request has been cancelled. Let me know if you need anything else.";
      }
    }

    // Parse comma or newline separated fields if provided together
    const parts = text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const addressParts = [];
      for (const part of parts) {
        const pMatch = part.match(/(\+?\d{10,13})/);
        if (pMatch && !order.customer_phone) {
          order.customer_phone = pMatch[0];
        } else if (
          !order.customer_name &&
          part.length > 2 &&
          part.length < 35 &&
          !/\d/.test(part) &&
          !/street|road|house|sector|block|phase|colony|area|near|flat|apt/i.test(part)
        ) {
          order.customer_name = part;
        } else {
          addressParts.push(part);
        }
      }
      if (addressParts.length > 0 && !order.delivery_address) {
        order.delivery_address = addressParts.join(", ");
      }
    } else {
      // Single piece
      const phoneMatch = text.match(/(\+?\d{10,13})/);
      if (phoneMatch && !order.customer_phone) {
        order.customer_phone = phoneMatch[0];
      } else if (/street|road|house|sector|block|apt|flat|phase|colony|near|st\.|h#|r#/i.test(text) || text.length > 15) {
        if (!order.delivery_address) order.delivery_address = text;
      } else if (!order.customer_name && text.length < 50 && !phoneMatch) {
        order.customer_name = text;
      }
    }

    // Re-check missing fields
    if (!order.customer_name) {
      return "Thank you. Could you please share your **Full Name** for the order recipient?";
    }
    if (!order.customer_phone) {
      return `Thank you, ${order.customer_name}. What is your **contact phone number** for delivery coordination?`;
    }
    if (!order.delivery_address) {
      return `Please provide the **complete delivery address** where you would like the medications delivered.`;
    }

    // All details present -> ask confirmation
    order.awaitingConfirmation = true;
    let sum = 0;
    let breakdown = "";
    order.items.forEach((it) => {
      const lt = it.quantity * it.price;
      sum += lt;
      breakdown += `• ${it.quantity}x ${it.name} - $${lt.toFixed(2)} ($${it.price.toFixed(2)} each)\n`;
    });

    let conf = `📋 **Please Confirm Your Cash on Delivery (COD) Order:**\n\n`;
    conf += `**Items:**\n${breakdown}`;
    conf += `• **Total Price:** $${sum.toFixed(2)}\n`;
    conf += `• **Payment:** Cash on Delivery (COD)\n`;
    conf += `• **Recipient:** ${order.customer_name} (${order.customer_phone})\n`;
    conf += `• **Delivery Address:** ${order.delivery_address}\n\n`;
    conf += `Would you like me to place this order now? (Reply **Yes** to confirm, or **Cancel** to abort)`;
    return conf;
  }

  // D. Start new pharmacy order
  if (isPharmacyOrderStart(text)) {
    // Search medicines in database
    const catalog = await searchPharmacyMedicines(pool);
    const matchedItems = [];

    // Parse potential quantities and medicines
    for (const med of catalog) {
      const cleanMed = med.name.toLowerCase();
      const words = cleanMed.split(/\s+/);
      const shortTitle = words.slice(0, 2).join(" ");
      const singleWord = words[0];

      const patterns = [
        new RegExp(`(\\d+)?\\s*(?:x|count|boxes?|packs?|strips?)?\\s*${cleanMed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
        new RegExp(`(\\d+)?\\s*(?:x|count|boxes?|packs?|strips?)?\\s*${shortTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
      ];
      if (singleWord.length > 4) {
        patterns.push(new RegExp(`(\\d+)?\\s*(?:x|count|boxes?|packs?|strips?)?\\s*${singleWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
      }

      for (const rx of patterns) {
        const match = text.match(rx);
        if (match && !matchedItems.some((i) => i.medicine_id === med.id)) {
          const qty = match[1] ? parseInt(match[1], 10) : 1;
          matchedItems.push({
            medicine_id: med.id,
            name: med.name,
            quantity: qty,
            price: med.price,
            available_stock: med.stock_quantity,
          });
          break;
        }
      }
    }

    // If exact name didn't match, check keywords like "panadol", "cough syrup", "insulin", "paracetamol", etc.
    if (matchedItems.length === 0) {
      const terms = ["panadol", "paracetamol", "amoxicillin", "insulin", "cough syrup", "ibuprofen", "aspirin", "omeprazole", "cetirizine"];
      for (const term of terms) {
        if (new RegExp(`\\b${term}\\b`, "i").test(text)) {
          const found = catalog.find((m) => m.name.toLowerCase().includes(term));
          if (found) {
            const qtyMatch = text.match(new RegExp(`(\\d+)\\s*(?:x\\s*)?${term}`, "i"));
            const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            matchedItems.push({
              medicine_id: found.id,
              name: found.name,
              quantity: qty,
              price: found.price,
              available_stock: found.stock_quantity,
            });
          }
        }
      }
    }

    if (matchedItems.length === 0) {
      return "I would be happy to help you place a Cash on Delivery order from our hospital pharmacy. Which medications and quantities would you like to order? (For example: 'Order 2 Paracetamol 500mg and 1 Cough Syrup')";
    }

    // Check stock for matched items
    const outOfStock = matchedItems.filter((i) => i.available_stock < i.quantity);
    if (outOfStock.length > 0) {
      const names = outOfStock.map((i) => `"${i.name}" (Requested: ${i.quantity}, Available: ${i.available_stock})`).join(", ");
      return `Unfortunately, we currently do not have sufficient stock for: ${names}. Please adjust your quantity or consult our pharmacist for alternatives.`;
    }

    // Prescription check note
    const prescriptionKeywords = ["amoxicillin", "ciprofloxacin", "metformin", "atorvastatin", "tramadol", "insulin", "lisinopril", "losartan", "azithromycin"];
    const requiresRx = matchedItems.some((i) => prescriptionKeywords.some((pk) => i.name.toLowerCase().includes(pk)));

    session.pharmacyOrder = {
      items: matchedItems,
      customer_name: null,
      customer_phone: null,
      delivery_address: null,
      requiresPrescription: requiresRx,
      awaitingConfirmation: false,
    };

    let reply = `Great, I have noted your order for:\n`;
    matchedItems.forEach((i) => {
      reply += `• ${i.quantity}x ${i.name} ($${i.price.toFixed(2)} each)\n`;
    });

    if (requiresRx) {
      reply += `\n📌 **Prescription Notice:** One or more of these medications requires a doctor's prescription. Our pharmacist will verify your prescription prior to dispatch.\n`;
    }

    reply += `\nTo proceed with Cash on Delivery, could you please provide your **Full Name**, **Contact Phone Number**, and **Delivery Address**?`;
    return reply;
  }

  // E. Pharmacy search / price inquiry
  if (isPharmacySearch(text)) {
    // Extract query word or category
    const cleanTerm = text
      .replace(/[?.,!]/g, "")
      .replace(
        /\b(do you have|is|in stock|stock of|availability of|price of|how much is|cost of|list medicines|show medicines|catalog|available hai|keemat|price kya hai|please|can you|tell me|what|which)\b/gi,
        ""
      )
      .trim();

    const results = await searchPharmacyMedicines(pool, { query: cleanTerm });
    if (results.length === 0) {
      return `I couldn't find any medications matching "${cleanTerm}" in our pharmacy inventory. Please feel free to ask our pharmacy staff or check our Online Pharmacy shop.`;
    }

    let reply = `💊 **Hospital Pharmacy Inventory (${results.length} item${results.length > 1 ? "s" : ""}):**\n\n`;
    results.slice(0, 8).forEach((med) => {
      let badge = "🟢 In Stock";
      if (med.stock_status === "out_of_stock") badge = "🔴 Out of Stock";
      else if (med.stock_status === "low_stock") badge = `🟡 Low Stock (${med.stock_quantity} left)`;

      reply += `• **${med.name}** (${med.category})\n`;
      reply += `  Price: $${med.price.toFixed(2)} | Status: ${badge}\n`;
    });

    if (results.length > 8) {
      reply += `\n*Showing top 8 results. Visit our Online Pharmacy for the complete catalog.*`;
    }
    reply += `\nTo order any of these with Cash on Delivery, simply say e.g., *"Order 2 ${results[0].name}"*.`;
    return reply;
  }

  return null;
}

// ============================================================
// 5. LABORATORY ACTIONS & BOOKING FLOW
// ============================================================

const LAB_TRACK_PATTERNS = [
  /\b(track lab|track test|lab results?|lab tracking)\b/i,
  /\bLAB-\d{4}-\d{6}\b/i,
  /\bLB-[A-Z0-9-]+\b/i,
];

const LAB_BOOKING_START_PATTERNS = [
  /\b(book|schedule|reserve)\b.*\b(lab|test|blood|cbc|lipid|urine|lft|rft|profile|biochemistry|culture|glucose|count)\b/i,
  /\b(book lab|book blood test|book test|schedule lab|home blood collection|home sample collection|lab appointment)\b/i,
  /\b(test book karna|blood test karwana|lab test schedule)\b/i,
];

const LAB_SEARCH_PATTERNS = [
  /\b(what lab tests|list lab tests|lab test prices?|cost of .* test|how much is .* test|available lab tests|turnaround time)\b/i,
  /\b(lab test kitne ka hai|test available hai|lab ke tests)\b/i,
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
    const codeMatch = text.match(/(LAB-\d{4}-\d{6}|LB-[A-Z0-9-]+)/i);
    const code = codeMatch ? codeMatch[0] : "";

    const labRecord = await trackLabBooking(pool, { trackingId: code });
    if (!labRecord) {
      return `No laboratory record was found for tracking ID "${code || text}". Please verify the code on your laboratory receipt (e.g. LAB-YYYY-XXXXXX).`;
    }

    let reply = `🧪 **Laboratory Booking & Test Results**\n\n`;
    reply += `• **Tracking ID:** \`${labRecord.tracking_id}\`\n`;
    reply += `• **Patient Name:** ${labRecord.patient_name}\n`;
    reply += `• **Service Type:** ${labRecord.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Lab Service"}\n`;
    reply += `• **Booking Date:** ${new Date(labRecord.booking_date).toISOString().slice(0, 10)}\n`;
    reply += `• **Current Status:** **${labRecord.status.replace(/_/g, " ").toUpperCase()}**\n\n`;

    if (labRecord.items && labRecord.items.length) {
      reply += `**Test Results Breakdown:**\n`;
      labRecord.items.forEach((item) => {
        reply += `• **${item.test_name}**\n`;
        if (item.result_value) {
          reply += `  - Value: **${item.result_value}** ${item.unit || ""}\n`;
          reply += `  - Normal Range: ${item.normal_range || "N/A"}\n`;
          reply += `  - Status: ${item.result_status ? item.result_status.toUpperCase() : "COMPLETED"}\n`;
          if (item.remarks) reply += `  - Remarks: ${item.remarks}\n`;
        } else {
          reply += `  - Status: *Sample Under Processing / Awaiting Findings*\n`;
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

          let reply = `✅ **Laboratory Service Successfully Booked!**\n\n`;
          reply += `• **Laboratory Tracking ID:** \`${created.tracking_id}\`\n`;
          reply += `• **Booking Reference:** \`${created.booking_code}\`\n`;
          reply += `• **Patient:** ${created.patient_name} (${created.patient_phone})\n`;
          reply += `• **Service Type:** ${created.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Lab"}\n`;
          reply += `• **Scheduled Date:** ${new Date(created.booking_date).toISOString().slice(0, 10)}\n`;
          reply += `• **Total Amount:** $${created.total_amount.toFixed(2)}\n\n`;
          reply += `**Selected Tests:**\n`;
          created.tests.forEach((t) => {
            reply += `• ${t.name} ($${t.price.toFixed(2)})\n`;
          });
          reply += `\n**Important Instructions:**\n`;
          reply += `• Please keep your Tracking ID \`${created.tracking_id}\` handy to view your results online.\n`;
          reply += `• For blood and biochemistry tests, 8–12 hours of overnight fasting is recommended prior to sample collection.`;
          return reply;
        } catch (err) {
          return `Failed to register laboratory booking: ${err.message}. Would you like to adjust the booking details?`;
        }
      } else if (/^(no|cancel|stop|nahin|nahi)$/i.test(text.trim())) {
        session.labBooking = null;
        return "Your laboratory booking has been cancelled.";
      }
    }

    // Parse comma/newline separated parts
    const parts = text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const part of parts) {
        const pMatch = part.match(/(\+?\d{10,13})/);
        const dMatch = part.match(/\b(202[6-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/);
        if (pMatch && !booking.patient_phone) {
          booking.patient_phone = pMatch[0];
        } else if ((dMatch || /tomorrow|today/i.test(part)) && !booking.booking_date) {
          if (dMatch) booking.booking_date = dMatch[0];
          else {
            const now = new Date();
            if (/tomorrow/i.test(part)) now.setDate(now.getDate() + 1);
            booking.booking_date = now.toISOString().slice(0, 10);
          }
        } else if (/home|clinic|in-clinic|walk-in/i.test(part)) {
          booking.service_type = /home/i.test(part) ? "home_service" : "in_clinic";
        } else if (/house|flat|apt|street|road|sector|block|colony|phase|near/i.test(part) || part.length > 15) {
          if (!booking.home_address) booking.home_address = part;
        } else if (!booking.patient_name && part.length > 2 && !/^\d+$/.test(part)) {
          booking.patient_name = part;
        }
      }
    } else {
      // Single piece
      const dateMatch = text.match(/\b(202[6-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/);
      if (dateMatch && !booking.booking_date) {
        booking.booking_date = dateMatch[0];
      } else if (!booking.booking_date && /tomorrow|today/i.test(text)) {
        const now = new Date();
        if (/tomorrow/i.test(text)) now.setDate(now.getDate() + 1);
        booking.booking_date = now.toISOString().slice(0, 10);
      }

      const phoneMatch = text.match(/(\+?\d{10,13})/);
      if (phoneMatch && !booking.patient_phone) {
        booking.patient_phone = phoneMatch[0];
      }

      if (/home|ghr|home service|doorstep/i.test(text)) {
        booking.service_type = "home_service";
      } else if (/clinic|hospital|in-clinic|walk-in/i.test(text)) {
        booking.service_type = "in_clinic";
      }

      if (booking.service_type === "home_service" && !booking.home_address) {
        if (/street|road|house|sector|block|apt|flat|phase|colony|near|st\.|h#|r#/i.test(text) || text.length > 15) {
          booking.home_address = text;
        }
      }

      if (!booking.patient_name && !phoneMatch && !dateMatch && text.length < 50 && !/home|clinic|tomorrow|today/i.test(text)) {
        booking.patient_name = text;
      }
    }

    // Validate home collection capability for tests
    if (booking.service_type === "home_service") {
      const unsupported = booking.tests.filter((t) => !t.is_home_collection_available);
      if (unsupported.length > 0) {
        booking.service_type = "in_clinic";
        return `⚠️ Notice: Home sample collection is not available for: ${unsupported.map((t) => t.name).join(", ")}. These tests require in-clinic hospital equipment. Would you like to proceed as an **In-Clinic** lab appointment? (Yes / No)`;
      }
    }

    // Check missing fields step-by-step
    if (!booking.patient_name) {
      return "Please provide the **Patient's Full Name** for the laboratory booking.";
    }
    if (!booking.patient_phone) {
      return `Thank you, ${booking.patient_name}. What is your **contact phone number**?`;
    }
    if (!booking.booking_date) {
      return "What **date** would you like to schedule the laboratory test? (e.g. tomorrow or YYYY-MM-DD)";
    }
    if (booking.service_type === "home_service" && !booking.home_address) {
      return "Please provide your **complete home address** for our mobile phlebotomist team to collect the sample.";
    }

    // All collected -> prompt confirmation
    booking.awaitingConfirmation = true;
    const total = booking.tests.reduce((sum, t) => sum + t.price, 0);

    let conf = `📋 **Laboratory Appointment Summary:**\n\n`;
    conf += `• **Patient Name:** ${booking.patient_name}\n`;
    conf += `• **Phone:** ${booking.patient_phone}\n`;
    conf += `• **Date:** ${booking.booking_date}\n`;
    conf += `• **Service Type:** ${booking.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Laboratory"}\n`;
    if (booking.home_address) conf += `• **Collection Address:** ${booking.home_address}\n`;
    conf += `• **Total Cost:** $${total.toFixed(2)}\n\n`;
    conf += `**Tests to be performed:**\n`;
    booking.tests.forEach((t) => {
      conf += `• ${t.name} ($${t.price.toFixed(2)})\n`;
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
      const cleanTestName = test.name.replace(/\(.*?\)/g, "").trim().toLowerCase();
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

    // If no exact match, check common terms: cbc, blood, lipid, urine, liver, lft, thyroid, glucose
    if (matched.length === 0) {
      const keywords = [
        { term: "cbc", name: "Complete Blood Count" },
        { term: "blood count", name: "Complete Blood Count" },
        { term: "lipid", name: "Lipid Profile" },
        { term: "cholesterol", name: "Lipid Profile" },
        { term: "glucose", name: "Fasting Blood Glucose" },
        { term: "sugar", name: "Fasting Blood Glucose" },
        { term: "liver", name: "Liver Function Test" },
        { term: "lft", name: "Liver Function Test" },
        { term: "thyroid", name: "Thyroid Profile" },
        { term: "tsh", name: "Thyroid Profile" },
        { term: "urine", name: "Urine Routine Examination" },
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
      return "I can help you book an in-clinic laboratory test or schedule home sample collection. Which lab test or blood work would you like to book? (For example: 'Book Complete Blood Count' or 'Schedule Lipid Profile test')";
    }

    const isHome = /home|ghr|doorstep/i.test(text);
    if (isHome) {
      const unsupported = matched.filter((t) => !t.is_home_collection_available);
      if (unsupported.length > 0) {
        return `⚠️ Home collection is not available for: ${unsupported.map((t) => t.name).join(", ")}. These tests require clinic facilities. Would you like to book them as **In-Clinic** tests instead?`;
      }
    }

    session.labBooking = {
      tests: matched,
      service_type: isHome ? "home_service" : "in_clinic",
      patient_name: null,
      patient_phone: null,
      booking_date: null,
      home_address: null,
      awaitingConfirmation: false,
    };

    let reply = `I have selected the following test(s) for your booking:\n`;
    matched.forEach((t) => {
      reply += `• **${t.name}** ($${t.price.toFixed(2)}) - ${t.is_home_collection_available ? "🏠 Home Collection Available" : "🏥 In-Clinic Only"}\n`;
    });
    reply += `\nWould you like **In-Clinic** or **Home Sample Collection**? Please also provide the **Patient Name** and preferred **Appointment Date**.`;
    return reply;
  }

  // E. Lab search / inquiries
  if (isLabSearch(text)) {
    const cleanTerm = text
      .replace(/[?.,!]/g, "")
      .replace(
        /\b(what lab tests|list lab tests|lab test prices?|cost of|how much is|tests?|available lab tests|turnaround time|kitne ka hai|do you offer|can you do|do you have|show)\b/gi,
        ""
      )
      .trim();

    const results = await searchLabTests(pool, { query: cleanTerm });
    if (results.length === 0) {
      return `I couldn't find any laboratory tests matching "${cleanTerm}". You can ask for tests like CBC, Lipid Profile, Blood Glucose, LFT, or Urine Examination.`;
    }

    let reply = `🧪 **Available Laboratory Tests (${results.length} found):**\n\n`;
    results.slice(0, 8).forEach((t) => {
      const homeBadge = t.is_home_collection_available ? "🏠 Home Collection Available" : "🏥 In-Clinic Only";
      reply += `• **${t.name}** (${t.category})\n`;
      reply += `  Code: \`${t.test_code}\` | Price: $${t.price.toFixed(2)} | Turnaround: ${t.turnaround_hours}h | ${homeBadge}\n`;
      if (t.normal_range) reply += `  Normal Range: ${t.normal_range} ${t.unit || ""}\n`;
    });

    if (results.length > 8) {
      reply += `\n*Showing top 8 tests. Please visit our Laboratory page for all 26+ available clinical tests.*`;
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
};
