import { Link } from "react-router-dom";
import {
  CalendarIcon,
  SparklesIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ActivityIcon,
  UsersIcon,
  ClockIcon,
  HospitalIcon,
  ArrowRightIcon,
  HeartPulseIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "../../components/icons/Icons";

export default function Home() {
  return (
    <div className="space-y-0">
      {/* ======================================================
          HERO SECTION — HOSPITAL WELCOME
      ====================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-950 via-slate-900 to-teal-900 text-white">
        {/* Decorative background glows */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left Column: Hospital Overview & Key Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Premier Tertiary Care & Clinical Research Center</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.14]">
                Advanced Medicine.{" "}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-cyan-200 to-white">
                  Compassionate Patient Care.
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300">
                City Care Hospital is a multi-specialty medical institution dedicated to delivering world-class outpatient care, 24/7 trauma response, certified pathology laboratory diagnostics, and doorstep pharmacy fulfillment — with zero account creation friction for patients.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/book"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-teal-400 px-6 py-3.5 text-sm font-bold text-teal-950 shadow-lg shadow-teal-400/20 transition-all duration-200 hover:bg-teal-300 hover:scale-105 active:scale-100"
                >
                  <CalendarIcon className="w-5 h-5 text-teal-950" />
                  <span>Book Outpatient Visit</span>
                </Link>

                <Link
                  to="/laboratory"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-teal-300/40 bg-teal-950/40 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:bg-teal-900/60 hover:border-teal-200"
                >
                  <ActivityIcon className="w-5 h-5 text-teal-300" />
                  <span>Laboratory & Tests</span>
                </Link>

                <Link
                  to="/pharmacy-shop"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-3.5 text-sm font-bold text-slate-200 backdrop-blur-md transition-all duration-200 hover:bg-slate-700/60 hover:text-white"
                >
                  <span>Online Pharmacy</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-teal-400" />
                  <span>Shift-Based OPD Tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-teal-400" />
                  <span>Physical Payment at Reception</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-teal-400" />
                  <span>Verified Senior Consultants</span>
                </div>
              </div>
            </div>

            {/* Right Card: Emergency & Urgent Care Highlight */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-teal-400/20 bg-gradient-to-b from-white/10 to-white/5 p-7 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/30">
                    <AlertTriangleIcon className="w-6 h-6 text-rose-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Emergency & Trauma Center</h2>
                    <p className="text-xs text-rose-300 font-medium">Open 24 Hours • 7 Days a Week</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  Critical medical emergencies, acute trauma, cardiac arrest, or stroke symptoms do not require advance appointment booking. Walk into our emergency center directly for immediate clinical triage.
                </p>

                <div className="mt-6 rounded-2xl bg-rose-950/50 border border-rose-800/40 p-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-rose-300 block">
                    Immediate Emergency Hotline
                  </span>
                  <a
                    href="tel:021111227391"
                    className="mt-1 flex items-center gap-2 text-xl font-extrabold text-white hover:text-rose-200 transition-colors"
                  >
                    <PhoneIcon className="w-5 h-5 text-rose-400" />
                    <span>+92 (21) 111-CARE-911</span>
                  </a>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 pt-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <span className="block font-bold text-teal-300 text-sm">Level 1</span>
                    <span className="text-slate-400 text-[11px]">Trauma Facility</span>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <span className="block font-bold text-teal-300 text-sm">&lt; 5 mins</span>
                    <span className="text-slate-400 text-[11px]">Emergency Triage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Hospital Stats Bar */}
        <div className="border-t border-teal-900/60 bg-teal-950/70 backdrop-blur-md">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-6 sm:grid-cols-4 sm:gap-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <UsersIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">50+</div>
                <div className="text-xs text-slate-400">Consultant Physicians</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <HospitalIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">15+</div>
                <div className="text-xs text-slate-400">Clinical Departments</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <ClockIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">24/7</div>
                <div className="text-xs text-slate-400">Emergency, Lab & Pharmacy</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <HeartPulseIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">100%</div>
                <div className="text-xs text-slate-400">Physical Reception Payment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          DETAILED HOSPITAL INTRODUCTION & CLINICAL PILLARS
      ====================================================== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Institutional Overview
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl leading-tight">
              A Modern Hospital Designed Around Patient Comfort and Clinical Accuracy
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              Founded on the principle that exceptional healthcare must be accessible and transparent, City Care Hospital provides comprehensive secondary and tertiary medical services under one integrated roof.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Our hospital eliminates complicated registration barriers. Outpatient consultations are organized on structured morning and evening physician shifts, allowing patients to consult senior consultants with sequential token calling. Consultation fees are settled physically at the clinic desk upon arrival, ensuring patients have complete clarity with zero online payment confusion.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <h4 className="text-sm font-bold text-teal-950">Diagnostic Excellence</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Fully equipped biochemistry, hematology, and clinical pathology laboratories with unique patient tracking codes for online result viewing.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <h4 className="text-sm font-bold text-teal-950">24/7 Hospital Pharmacy</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Direct digital prescription fulfillment alongside an online retail storefront providing doorstep delivery with cash on delivery.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-teal-900 to-teal-950 p-8 text-white shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-8 h-8 text-teal-300" />
                <div>
                  <h3 className="text-xl font-bold text-white">Our Healthcare Commitments</h3>
                  <p className="text-xs text-teal-200">Patient-first standards followed across all hospital wards</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-200 divide-y divide-teal-800/60">
                <div className="pt-3 first:pt-0">
                  <h5 className="font-semibold text-white flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    Transparent In-Person Fee Collection
                  </h5>
                  <p className="mt-1 text-xs text-slate-300">
                    Consultation and laboratory fees are clearly stated upfront and paid physically at hospital cash counters. We do not require or collect online card payments.
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-semibold text-white flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    Certified Medical Practitioners
                  </h5>
                  <p className="mt-1 text-xs text-slate-300">
                    Every consulting physician maintains active credentials verified by regulatory bodies with extensive tertiary clinical experience.
                  </p>
                </div>

                <div className="pt-3">
                  <h5 className="font-semibold text-white flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    Integrated Digital Records
                  </h5>
                  <p className="mt-1 text-xs text-slate-300">
                    Prescriptions written during your doctor consultation flow instantly to our pharmacy counter, cutting waiting times significantly.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-teal-800/60 text-xs">
                <span className="text-teal-300 font-medium">Main Hospital Campus</span>
                <span className="text-slate-300">Medical District, Karachi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          NAVIGATIONAL FEATURE SPOTLIGHTS (CONCISE CTA LINKS)
      ====================================================== */}
      <section className="border-y border-slate-200/80 bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Hospital Services & Navigation
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              Comprehensive Medical Facilities
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Explore our specialized hospital departments, browse physician profiles, access laboratory testing, or order pharmaceutical essentials.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. Clinical Departments CTA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                  <ActivityIcon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Explore Our Departments</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  From Heart Care (Cardiology) and Child Health (Pediatrics) to Bone & Joint Care (Orthopedics), explore specialized clinical units staffed with experienced physicians.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/departments"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-600 transition"
                >
                  <span>View All Clinical Departments</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 2. Specialists Directory CTA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                  <UsersIcon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Meet Our Specialists</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Consult with leading medical experts, view qualifications, review working shifts, and book your OPD visit directly with clear consultation fees.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/doctors"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-600 transition"
                >
                  <span>Find a Consultant Doctor</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 3. Laboratory Services CTA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                  <ShieldCheckIcon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Laboratory & Diagnostic Services</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Book laboratory appointments, request home sample collection, or enter your unique Laboratory Tracking ID to inspect clinical test results online.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/laboratory"
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-600 transition"
                >
                  <span>Book Lab Services</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/laboratory"
                  className="text-xs font-semibold text-slate-500 hover:text-teal-900 underline"
                >
                  Track Results
                </Link>
              </div>
            </div>

            {/* 4. Online Pharmacy Shop CTA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                  <HospitalIcon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Online Pharmacy Shop</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Browse authentic pharmaceuticals from our verified hospital catalog. Add to cart, place orders with simple contact info, and pay cash on delivery.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/pharmacy-shop"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-600 transition"
                >
                  <span>Visit Online Pharmacy</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 5. AI Medical Assistant CTA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                  <SparklesIcon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">AI Health Guide (24/7)</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Get preliminary clinical triage and specialist recommendations in English, Urdu, or Roman Urdu anytime from our conversational health assistant.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/assistant"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-600 transition"
                >
                  <span>Ask AI Assistant</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 6. Patient Reviews CTA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                  <HeartPulseIcon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Patient Experiences</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Read authentic feedback from families who received care at Smart Hospital, or share your own experience on our dedicated reviews portal.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/reviews"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-600 transition"
                >
                  <span>Read Patient Reviews</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          HOSPITAL HOURS & APPOINTMENT CALLOUT
      ====================================================== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-teal-950 p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              Ready to visit?
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Schedule Your Consultation in Under 2 Minutes
            </h3>
            <p className="text-sm text-teal-100 max-w-xl">
              Select your doctor and preferred shift. Payment is made physically at reception upon arrival.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-teal-950 shadow-md transition hover:bg-teal-50"
            >
              <CalendarIcon className="w-4 h-4 text-teal-800" />
              <span>Book Appointment Now</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}