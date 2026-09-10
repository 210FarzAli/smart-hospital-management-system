import { Link } from "react-router-dom";
import type { Doctor } from "../lib/types";
import StarRating from "./StarRating";

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Link to={`/doctors/${doctor.id}`} className="card block transition hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-900">
          {doctor.full_name
            .replace("Dr. ", "")
            .split(" ")
            .map((p) => p[0])
            .join("")}
        </div>
        <div>
          <div className="font-medium text-teal-950">{doctor.full_name}</div>
          <div className="text-sm text-slate-500">{doctor.specialization}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <StarRating rating={doctor.rating} />
        <span className="font-medium text-teal-900">Rs. {doctor.consultation_fee}</span>
      </div>
    </Link>
  );
}
