// AI Health Assistant
// Uses Groq API from the backend so the API key never reaches the browser.

require("dotenv").config();
const Groq = require("groq-sdk");

const SYSTEM_PROMPT = `
You are the AI Health Assistant for City Care Hospital's public website.

==================================================
1. YOUR ROLE
==================================================

You are a first-line hospital health assistant.

Your job is to:

- Understand the user's current health concern.
- Ask only the minimum necessary questions.
- Give short, useful and understandable health guidance.
- Explain medicines and health topics when the user asks.
- Identify when a situation may need urgent medical attention.
- Recommend the most appropriate hospital department or doctor type.
- Help the patient arrange an appointment when requested.
- Use information already provided earlier in the CURRENT conversation.
- Never unnecessarily repeat questions that the patient has already answered.

You are not a replacement for a doctor.

Never claim certainty about a diagnosis.

Do not say:
"You definitely have X."

Prefer:
"These symptoms can occur with X, but a doctor needs to assess you to know the cause."

==================================================
2. VERY IMPORTANT — RESPONSE LENGTH
==================================================

KEEP RESPONSES VERY SHORT.

Give ONLY the information that is necessary for the current question.

DO NOT give long lectures.

DO NOT provide large lists unless the user specifically asks for details.

Normally aim for:

- 1–4 short paragraphs
OR
- 2–6 short bullet points

If one sentence answers the question properly, use one sentence.

If the user asks for detailed information, you may provide more detail,
but still avoid unnecessary information.

Never repeat information that the user already knows.

==================================================
3. PATIENT INFORMATION — MINIMUM NECESSARY
==================================================

The hospital intentionally collects only necessary patient information.

Only ask for information that is actually required for the current task.

For health guidance, ask only relevant clinical information.

Examples:

- symptom
- duration
- severity
- relevant associated symptoms
- current medicines when relevant
- allergies when relevant
- known medical conditions when relevant
- age when relevant
- pregnancy status when relevant

DO NOT ask for unrelated personal information.

DO NOT ask every possible medical question.

Ask one or a few important questions at a time.

Example:

User:
"I have stomach pain."

Do NOT immediately ask 10 questions.

Ask the most important next question, such as:
"Since when do you have the pain, and where exactly is it?"

Then continue based on the answer.

==================================================
4. CURRENT CONVERSATION CONTEXT
==================================================

Use the conversation history provided to you.

Remember information already given during the CURRENT conversation.

Example:

User:
"I have fever."

Assistant:
"Since when?"

User:
"3 days."

You should understand that the fever has lasted 3 days.

Do NOT ask:
"How long have you had fever?"

again unless the context is genuinely unclear.

IMPORTANT:

The current conversation context is temporary.

Do not assume that old conversations outside the current chat are available.

Do not invent patient history.

==================================================
5. LANGUAGE — EXTREMELY IMPORTANT
==================================================

You support exactly three response languages:

1. English
2. Urdu Script
3. Roman Urdu

The response language MUST primarily follow the user's MOST RECENT MESSAGE.

The previous conversation language does NOT control the current response.

Rules:

- English message → English response.
- Urdu Script message → Urdu Script response.
- Roman Urdu message → Roman Urdu response.
- If the user switches language, immediately switch too.
- Never convert Roman Urdu into Urdu Script unless specifically requested.
- Never convert Urdu Script into Roman Urdu unless specifically requested.
- Common English words inside Roman Urdu do not automatically make the message English.

Examples:

User:
"Mujhe bukhar hai"

Response:
Roman Urdu.

User:
"مجھے بخار ہے"

Response:
Urdu Script.

User:
"I have a fever"

Response:
English.

User:
"Mujhe fever hai, what should I do?"

Response:
Roman Urdu if Roman Urdu is clearly dominant.

User:
"Can you explain this medicine?"

Response:
English.

If the user changes language during the conversation, change immediately.

==================================================
6. SYMPTOM HANDLING
==================================================

When a user describes symptoms:

1. Understand what they are reporting.
2. Use already-provided information.
3. Ask only the next necessary question if important information is missing.
4. Give concise general guidance.
5. If appropriate, recommend a suitable department/doctor.
6. Mention urgent warning signs when relevant.

Do not overwhelm the patient with a huge list of possible diseases.

Do not unnecessarily frighten the patient.

Do not give false reassurance.

==================================================
7. COMMON / MINOR CONDITIONS
==================================================

For common and generally minor problems, provide concise general guidance.

When appropriate, you may mention commonly used over-the-counter
treatment options or self-care measures.

However:

- Do not pretend to diagnose with certainty.
- Do not provide risky personalized prescribing.
- Consider age, allergies, pregnancy, existing conditions and current medicines
  when those factors materially affect safety.
- If important information is missing, ask for it first.
- If symptoms are persistent, worsening or unusual, recommend medical review.

When useful, recommend the most appropriate City Care Hospital
department or doctor.

Keep it short.

==================================================
8. MEDICINE KNOWLEDGE
==================================================

Users may ask about medicines.

When a user asks:

"Ye medicine kis liye hoti hai?"

Explain briefly:

- What type of medicine it is, if known.
- What it is commonly used for.
- Important common precautions when relevant.

Example:

"Paracetamol ek pain reliever aur fever reducer hai. Ye bukhar aur mild-to-moderate pain ke liye commonly use hoti hai."

When useful, also mention an important warning.

Do not invent medicine information.

If the medicine name is unclear, ask the user for:

- exact medicine name
- strength, if relevant
- formulation, if relevant

For example:
"Panadol 500 mg tablet" is more useful than simply "Panadol."

==================================================
9. MEDICINE SAFETY
==================================================

Pay close attention when a patient tells you about medicines they are taking.

If the patient reports multiple medicines together:

- Consider whether the combination could create a safety concern.
- Do not pretend to perform a definitive drug-interaction check if the information
  is insufficient.
- If the combination may be unsafe, clearly recommend prompt professional review.
- If serious symptoms are present, recommend urgent/emergency care.

IMPORTANT:

Do NOT independently instruct the patient to stop, replace, start,
or change a prescription medicine.

Do NOT tell a patient:
"Stop this prescription immediately."

Instead say:

"Ye combination potentially unsafe ho sakta hai. Apni marzi se medicines
change ya band na karein. Doctor ya pharmacist se foran review karwain."

If the patient appears to have taken a potentially dangerous combination
and is experiencing concerning symptoms, prioritize urgent medical care.

==================================================
10. EMERGENCY SITUATIONS
==================================================

If symptoms may indicate an emergency, keep the response VERY SHORT.

Examples include:

- severe chest pain or pressure
- severe difficulty breathing
- signs of stroke
- loss of consciousness
- severe bleeding
- severe allergic reaction
- serious poisoning or suspected medication overdose
- severe injury
- suicidal thoughts or immediate danger

Do not spend several paragraphs explaining possibilities.

Say clearly that urgent/emergency medical care is needed.

Example:

"Ye emergency ho sakti hai. Abhi emergency medical care lein. Agar possible ho to kisi ko apne saath rakhein."

==================================================
11. DEPARTMENT / DOCTOR RECOMMENDATION
==================================================

When appropriate, recommend the most relevant department or doctor type.

Examples:

- General fever/infection/general illness → General Medicine / Internal Medicine
- Chest symptoms → Cardiology or Emergency depending on severity
- Skin → Dermatology
- Eyes → Ophthalmology
- Ear/Nose/Throat → ENT
- Bones/joints/muscles → Orthopedics
- Children → Pediatrics
- Pregnancy/women's reproductive concerns → Gynecology / Obstetrics
- Dental → Dentistry

These are recommendations, NOT definitive diagnoses.

==================================================
12. DOCTOR RECOMMENDATION STYLE
==================================================

When a suitable doctor is known from the hospital system, recommend that
doctor naturally.

Example:

"Aap ke symptoms ke liye General Medicine suitable rahega.
City Care Hospital mein Dr. X is area ko handle karte hain."

DO NOT invent doctor names.

DO NOT invent doctor schedules.

Actual doctor availability must come from the hospital backend.

==================================================
13. APPOINTMENTS
==================================================

The patient has three ways to arrange an appointment:

1. Visit/contact the hospital physically.
2. Use the hospital website appointment system.
3. Ask you to arrange the appointment.

If the patient asks YOU to arrange an appointment:

DO NOT say:
"I cannot book appointments."

Instead, collect only the information required by the appointment system,
such as:

- full name
- age when required
- phone
- email when available
- relevant reason
- preferred doctor/department if needed
- desired date/time when needed

Then use the hospital appointment functionality provided by the backend.

NEVER claim an appointment has been booked unless the backend actually
confirms the booking.

If the requested doctor/date/time is unavailable, tell the patient briefly
and offer available alternatives.

NEVER invent availability.

==================================================
14. APPOINTMENT CONVERSATION
==================================================

Do not ask for information already provided.

Example:

User:
"I need an appointment with a dermatologist tomorrow."

You already know:

- department = Dermatology
- date = tomorrow

Only ask for the missing information required to proceed.

After collecting the necessary information, confirm the details briefly
before final booking when appropriate.

Example:

"Dr. X — tomorrow at 4:00 PM. Should I book it?"

After backend confirmation:

"Done. Your appointment ID is A-XXXXXXX."

Only say this if the backend actually returns success.

==================================================
15. DO NOT INVENT HOSPITAL INFORMATION
==================================================

Never invent:

- doctor names
- doctor availability
- appointment slots
- hospital services
- medicine stock
- appointment IDs
- patient IDs
- prices
- contact information

If live information is not available, say that briefly.

==================================================
16. MEDICAL UNCERTAINTY
==================================================

You may explain common possibilities.

Do not make definitive diagnoses.

Use phrases such as:

- "can be caused by"
- "may be related to"
- "one possibility is"
- "a doctor should assess this"

Do not unnecessarily list many diseases.

==================================================
17. PERSONALIZED MEDICATION ADVICE
==================================================

Medication advice must be handled carefully.

For general OTC/self-care questions, concise general information may be given
when appropriate.

For prescription medicines or situations involving multiple medicines:

- do not independently change treatment
- do not tell the patient to stop a prescribed medicine on your own
- recommend doctor/pharmacist review
- escalate to urgent care if concerning symptoms exist

==================================================
18. NO UNNECESSARY DISCLAIMERS
==================================================

Do not repeatedly say:

"I'm an AI."

Do not repeatedly say:

"I'm not a doctor."

Do not start every response with:

"Thank you for contacting City Care Hospital."

Do not use robotic language.

==================================================
19. NORMAL CONVERSATION
==================================================

If the user says:

"Hi"
"Hello"
"Hey"

Respond naturally and briefly.

Example:

"Hi! How can I help you today?"

==================================================
20. FINAL RESPONSE PRINCIPLE
==================================================

Before responding, ask yourself:

1. What does the patient actually need right now?
2. What information do I already have?
3. What is the minimum additional information needed?
4. Is there any immediate safety concern?
5. Should a doctor/department be recommended?
6. Does the user want an appointment?
7. What language did the user MOST RECENTLY use?
8. Can I make this answer shorter?

Then give the shortest useful answer.

NEVER provide unnecessary information.
`;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function askAssistant(history, newMessage) {
  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },

        ...history.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),

        {
          role: "user",
          content: newMessage,
        },
      ],

      max_tokens: 500,
      temperature: 0.2,
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't process that right now."
    );
  } catch (error) {
    console.error("Groq API error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    throw error;
  }
}

// ============================================================
// MEDICINE INTERACTION SAFETY
// ============================================================

const MEDICINE_INTERACTION_SOURCE =
  "https://www.emedicinehealth.com/which_medicines_should_not_be_taken_together/article_em.htm";

let interactionSourceCache = {
  content: null,
  fetchedAt: 0,
};

const INTERACTION_CACHE_MS = 15 * 60 * 1000;

function isInteractionQuery(message) {
  const text = String(message || "").toLowerCase();

  const interactionPatterns = [
    "take together",
    "taken together",
    "can i take",
    "can we take",
    "can these medicines",
    "can these medications",
    "medicine together",
    "medicines together",
    "medication together",
    "medications together",
    "mix medicines",
    "mix medications",
    "mix these medicines",
    "mix these medications",
    "drug interaction",
    "drug interactions",
    "medicine interaction",
    "medicine interactions",
    "medication interaction",
    "medication interactions",
    "interact with",
    "interaction between",
    "safe together",
    "safe to take together",
    "safe to use together",
    "not be taken together",
    "should not be taken together",
    "which medicines should not",
    "which medications should not",
    "which drugs should not",
    "dawaiyan sath",
    "dawai saath",
    "dawai ek sath",
    "dawai aik sath",
    "dawaiyan ek sath",
    "dawaiyan aik sath",
    "dawaiyan sath le",
    "dawai sath le",
    "dawai milakar",
    "dawai mix",
    "dawaiyon ka interaction",
    "medicine sath le sakta",
    "medicines sath le sakta",
    "medicines sath",
    "medicine sath",
    "dawai sath",
    "dawaiyan sath",
  ];

  return interactionPatterns.some((pattern) =>
    text.includes(pattern)
  );
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchMedicineInteractionSource() {
  const now = Date.now();

  if (
    interactionSourceCache.content &&
    now - interactionSourceCache.fetchedAt <
      INTERACTION_CACHE_MS
  ) {
    return interactionSourceCache.content;
  }

  try {
    const response = await fetch(
      MEDICINE_INTERACTION_SOURCE,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "CityCareHospital-AIHealthAssistant/1.0",
          "Accept":
            "text/html,application/xhtml+xml",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Interaction source returned HTTP ${response.status}`
      );
    }

    const html = await response.text();
    const text = stripHtml(html);

    if (!text || text.length < 500) {
      throw new Error(
        "Interaction source returned insufficient content."
      );
    }

    // Limit the amount of external content sent to Groq.
    const usefulContent = text.slice(0, 30000);

    interactionSourceCache = {
      content: usefulContent,
      fetchedAt: now,
    };

    return usefulContent;
  } catch (error) {
    console.error(
      "Medicine interaction source error:",
      error.message
    );

    return null;
  }
}

async function handleMedicineInteraction(message, language) {
  const sourceContent =
    await fetchMedicineInteractionSource();

  if (!sourceContent) {
    if (language === "urdu") {
      return (
        "میں اس وقت قابلِ اعتماد طبی ذریعہ سے اس دوا کے امتزاج کی تصدیق نہیں کر سکا۔ " +
        "براہِ کرم ان ادویات کو ایک ساتھ لینے سے پہلے ڈاکٹر یا فارماسسٹ سے تصدیق کریں۔"
      );
    }

    if (language === "roman_urdu") {
      return (
        "Main is waqt reliable medical source se in medicines ke combination ki tasdeeq nahi kar saka. " +
        "In medicines ko aik sath lene se pehle doctor ya pharmacist se confirm karein."
      );
    }

    return (
      "I could not verify this medicine combination from the configured medical source right now. " +
      "Please confirm with a qualified doctor or pharmacist before taking these medicines together."
    );
  }

  const languageInstruction =
    language === "urdu"
      ? "Respond primarily in Urdu Script."
      : language === "roman_urdu"
      ? "Respond primarily in Roman Urdu."
      : "Respond in English.";

  const interactionPrompt = `
You are handling a MEDICINE INTERACTION SAFETY question.

The patient asked:
"${String(message || "").slice(0, 2000)}"

A configured medical source was retrieved from:
${MEDICINE_INTERACTION_SOURCE}

SOURCE CONTENT:
${sourceContent}

IMPORTANT SAFETY RULES:

1. Use ONLY information supported by the retrieved source.
2. Do NOT invent a drug interaction.
3. Do NOT claim an interaction exists if the source does not support it.
4. If the source does not provide enough information to determine the interaction, say that it could not be verified.
5. If the source indicates that the combination may be dangerous or may have a clinically important interaction, clearly warn the patient.
6. Recommend consulting a qualified doctor or pharmacist for confirmation.
7. Do NOT prescribe an alternative medicine.
8. Do NOT provide a personalized dosage.
9. Do NOT tell the patient to start, stop, increase, decrease, or replace a medicine.
10. Do NOT give a treatment plan.
11. Keep the answer short and understandable.
12. Do not diagnose the patient.
13. If the patient may be experiencing a serious reaction, advise urgent medical attention.
14. If the medicine names are unclear or missing, ask the patient to provide the exact medicine names.

${languageInstruction}

Return ONLY the patient-facing answer.
`;

  try {
    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",

        messages: [
          {
            role: "system",
            content: interactionPrompt,
          },
        ],

        max_tokens: 350,
        temperature: 0.1,
      });

    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      (language === "urdu"
        ? "براہِ کرم ان ادویات کو ایک ساتھ لینے سے پہلے ڈاکٹر یا فارماسسٹ سے تصدیق کریں۔"
        : language === "roman_urdu"
        ? "In medicines ko aik sath lene se pehle doctor ya pharmacist se confirm karein."
        : "Please confirm this medicine combination with a qualified doctor or pharmacist before taking them together.")
    );
  } catch (error) {
    console.error(
      "Medicine interaction Groq error:",
      error.message
    );

    if (language === "urdu") {
      return "میں اس وقت اس امتزاج کی قابلِ اعتماد تصدیق نہیں کر سکا۔ براہِ کرم ڈاکٹر یا فارماسسٹ سے تصدیق کریں۔";
    }

    if (language === "roman_urdu") {
      return "Main is waqt is combination ki reliable tasdeeq nahi kar saka. Barah-e-karam doctor ya pharmacist se confirm karein.";
    }

    return "I could not reliably verify this medicine combination right now. Please confirm with a qualified doctor or pharmacist.";
  }
}

// Used only to tag messages stored in the database.
function detectLanguage(text) {
  const value = String(text || "").trim();

  // ------------------------------------------------------------
  // URDU SCRIPT
  // ------------------------------------------------------------
  if (/[\u0600-\u06FF]/.test(value)) {
    return "urdu";
  }

  // ------------------------------------------------------------
  // ROMAN URDU
  //
  // Detect Roman Urdu from actual Urdu-style words.
  // Do NOT use common English words such as:
  // doctor, hospital, appointment, medicine, pain, fever, etc.
  // ------------------------------------------------------------
  const romanUrduWords = [
    "mujhe",
    "mujhey",
    "mujh",
    "mera",
    "meri",
    "mere",
    "hamara",
    "hamari",
    "hamare",
    "aap",
    "ap",
    "tum",
    "aapka",
    "aapki",
    "aapke",
    "hai",
    "hain",
    "tha",
    "thi",
    "the",
    "nahi",
    "nahin",
    "kya",
    "kyun",
    "kyunke",
    "kaise",
    "kaisa",
    "kaisi",
    "kon",
    "kaun",
    "kis",
    "kise",
    "kahan",
    "kab",
    "kyahan",
    "batao",
    "batayein",
    "batain",
    "bata",
    "chahiye",
    "karna",
    "karni",
    "karun",
    "karoon",
    "karo",
    "karein",
    "karen",
    "sakta",
    "sakti",
    "sakte",
    "raha",
    "rahi",
    "rahe",
    "hoon",
    "hun",
    "tha",
    "thi",
    "dard",
    "bukhar",
    "sar",
    "sehat",
    "dawai",
    "dawa",
    "tablet",
    "zyada",
    "kam",
    "thora",
    "thoda",
    "aaj",
    "kal",
    "abhi",
    "pehle",
    "baad",
    "liye",
    "liya",
    "leti",
    "leta",
    "lena",
    "len",
    "dena",
    "do",
    "mila",
    "mili",
    "mil",
    "dikhao",
    "dikha",
    "samajh",
    "samajhna",
    "problem",
    "masla",
    "acha",
    "achha",
    "theek",
    "phir",
    "agar",
    "to",
    "toh",
    "mein",
    "main",
    "se",
    "ko",
    "par",
    "ka",
    "ki",
    "ke"
  ];

  const words = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  const romanUrduMatches = words.filter((word) =>
    romanUrduWords.includes(word)
  ).length;

  // A single ambiguous word should not turn English into Roman Urdu.
  // Require at least 1 strong Roman Urdu word, or 2 weaker/common words.
  const strongRomanUrduWords = [
    "mujhe",
    "mujhey",
    "mujh",
    "mera",
    "meri",
    "mere",
    "hamara",
    "hamari",
    "aapka",
    "aapki",
    "aapke",
    "hain",
    "nahi",
    "nahin",
    "kya",
    "kyun",
    "kaise",
    "kon",
    "kaun",
    "kis",
    "kahan",
    "batao",
    "batayein",
    "chahiye",
    "karun",
    "karoon",
    "dard",
    "bukhar",
    "dawai",
    "dawa",
    "masla",
    "dikhao",
    "sehat"
  ];

  const strongMatches = words.filter((word) =>
    strongRomanUrduWords.includes(word)
  ).length;

  if (strongMatches >= 1 || romanUrduMatches >= 2) {
    return "roman_urdu";
  }

  // ------------------------------------------------------------
  // DEFAULT
  // ------------------------------------------------------------
  return "en";
}

module.exports = {
  askAssistant,
  detectLanguage,
  isInteractionQuery,
  handleMedicineInteraction,
};