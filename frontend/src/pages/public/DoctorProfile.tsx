import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doctorsApi, reviewsApi } from "../../lib/apiClient";
import type { Doctor, Review } from "../../lib/types";
import StarRating from "../../components/StarRating";

export default function DoctorProfile() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!id) return;
    doctorsApi.get(id).then(setDoctor).catch(console.error);
    reviewsApi.list(id).then(setReviews).catch(console.error);
  }, [id]);

  if (!doctor) return <div className="mx-auto max-w-6xl px-6 py-12 text-slate-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-start gap-6">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-2xl font-semibold text-teal-900">
          {doctor.full_name.replace("Dr. ", "").split(" ").map((p) => p[0]).join("")}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">{doctor.full_name}</h1>
          <p className="text-slate-600">{doctor.specialization} &middot; {doctor.department_name}</p>
          <p className="text-sm text-slate-500">{doctor.qualification} &middot; {doctor.experience_years} years experience</p>
          <div className="mt-2"><StarRating rating={doctor.rating} /></div>
        </div>
      </div>

      <p className="mt-6 text-slate-700">{doctor.description}</p>

      <div className="mt-6 card">
        <div className="font-medium text-teal-950">Availability / OPD Schedule</div>
        <ul className="mt-2 text-sm text-slate-600">
          {doctor.availability?.map((a, i) => (
            <li key={i}>{a.day}: {a.start_time} – {a.end_time}</li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Consultation fee</span>
          <span className="font-medium text-teal-900">Rs. {doctor.consultation_fee}</span>
        </div>
        <Link to={`/book?doctorId=${doctor.id}`} className="btn-primary mt-4 w-full">
          Book with {doctor.full_name}
        </Link>
      </div>

      <h2 className="mt-10 text-xl font-semibold text-teal-950">Reviews</h2>
      <div className="mt-4 space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-center justify-between">
              <span className="font-medium text-teal-950">{r.reviewer_name}</span>
              <StarRating rating={r.rating} />
            </div>
            {r.is_verified_patient && (
              <span className="mt-1 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">
                Verified Patient
              </span>
            )}
            <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-slate-500">No reviews yet.</p>}
      </div>
    </div>
  );
}
