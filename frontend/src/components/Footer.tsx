export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-teal-950 py-10 text-teal-100">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 text-sm sm:grid-cols-3">
        <div>
          <div className="text-base font-semibold text-white">City Care Hospital</div>
          <p className="mt-2 text-teal-300">
            Open access for patients — browse, book, and ask our AI Health Assistant anytime,
            no account required.
          </p>
        </div>

        <div>
          <div className="font-medium text-white">Quick Links</div>
          <ul className="mt-2 space-y-1 text-teal-300">
            <li>Departments</li>
            <li>Doctors</li>
            <li>Careers</li>
            <li>FAQs</li>
          </ul>
        </div>

        <div>
          <div className="font-medium text-white">Staff Login</div>
          <ul className="mt-2 space-y-1 text-teal-300">
            <li>
              <a href="/admin/login" className="hover:text-white">
                Admin Panel
              </a>
            </li>

            <li>
              <a href="/doctor/login" className="hover:text-white">
                Doctor Panel
              </a>
            </li>

            <li>
              <a href="/pharmacy/login" className="hover:text-white">
                Pharmacy Panel
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}