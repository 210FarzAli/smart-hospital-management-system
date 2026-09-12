import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  reportsApi,
  reviewsApi,
  type ReportOverview,
  type HospitalReview,
  type ReviewSummary,
} from "../../lib/apiClient";
import StarRating from "../../components/StarRating";
import {
  Users,
  User,
  Calendar,
  Clock,
  Star,
  CheckCircle,
  Stethoscope,
  Pill,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
} from "../../components/icons/Icons";

export default function AdminDashboard() {
  const [stats, setStats] = useState<ReportOverview | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<HospitalReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    reportsApi
      .overview()
      .then(setStats)
      .catch(console.error);

    async function loadReviews() {
      try {
        setLoadingReviews(true);
        const [summary, reviewList] = await Promise.all([
          reviewsApi.summary(),
          reviewsApi.adminList(),
        ]);
        setReviewSummary(summary);
        setReviews(reviewList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingReviews(false);
      }
    }

    loadReviews();
  }, []);

  const cards = [
    {
      label: "Active Doctors",
      value: stats?.doctors ?? "—",
      subtext: "On-duty & visiting specialists",
      icon: Stethoscope,
      bg: "bg-teal-50 text-teal-800",
      link: "/admin/doctors",
    },
    {
      label: "Registered Patients",
      value: stats?.patients ?? "—",
      subtext: "Clinical database records",
      icon: Users,
      bg: "bg-cyan-50 text-cyan-800",
      link: "/admin/appointments",
    },
    {
      label: "Appointments Today",
      value: stats?.appointmentsToday ?? "—",
      subtext: "Booked OPD shifts for today",
      icon: Calendar,
      bg: "bg-emerald-50 text-emerald-800",
      link: "/admin/appointments",
    },
    {
      label: "Confirmed Appointments",
      value: stats?.totalAppointments ?? "—",
      subtext: "Directly confirmed OPD tokens",
      icon: CheckCircle,
      bg: "bg-teal-50 text-teal-800",
      link: "/admin/appointments",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hospital Administration Overview
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Operational overview, OPD appointment volume, and public satisfaction index.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/doctors"
            className="btn-outline inline-flex items-center gap-2 text-xs"
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Manage Doctors
          </Link>
          <Link
            to="/admin/appointments"
            className="btn-primary inline-flex items-center gap-2 text-xs shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5" />
            View Appointments
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.link}
              className="card group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                  {card.label}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 text-3xl font-extrabold tracking-tight text-teal-950">
                {card.value}
              </div>

              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                <span>{card.subtext}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-teal-700" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Two-Column Middle: Website Feedback & Quick Management */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Rating & Patient Feedback Summary (Col 5) */}
        <div className="card p-6 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-teal-950">
                Patient Satisfaction Index
              </h2>
              <p className="text-xs text-slate-500">
                Verified public ratings and clinic sentiment
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              {reviewSummary?.totalReviews ?? 0} Reviews
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-teal-50/50 to-transparent p-6 text-center">
            <div className="text-5xl font-extrabold text-teal-950">
              {loadingReviews
                ? "—"
                : reviewSummary?.averageRating.toFixed(1) ?? "0.0"}
            </div>
            <div className="mt-2">
              <StarRating
                rating={Math.round(reviewSummary?.averageRating ?? 0)}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-teal-900">
              Average Patient Rating (Out of 5)
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Calculated across all validated hospital department reviews
            </p>
          </div>

          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Overall Hospital Recommendation</span>
              <span className="font-bold text-teal-900">96.4%</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Physician Care Quality</span>
              <span className="font-bold text-teal-900">4.9 / 5</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Pharmacy & OPD Experience</span>
              <span className="font-bold text-teal-900">4.8 / 5</span>
            </div>
          </div>
        </div>

        {/* Recent Reviews (Col 7) */}
        <div className="card p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-teal-950">
                Latest Patient Feedback
              </h2>
              <p className="text-xs text-slate-500">
                Recent submissions from visitors and treated patients
              </p>
            </div>
            <Link
              to="/reviews"
              className="text-xs font-semibold text-teal-800 hover:text-teal-950"
            >
              View Public Page →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
            {loadingReviews ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading feedback...
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No patient reviews recorded yet.
              </div>
            ) : (
              reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-950 text-xs sm:text-sm">
                        {review.reviewer_name}
                      </span>
                      {review.is_verified_patient && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 ring-1 ring-teal-200">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <StarRating rating={review.rating} />
                  </div>

                  {review.comment && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      "{review.comment}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}