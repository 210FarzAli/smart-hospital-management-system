const nodemailer = require("nodemailer");

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

const HOSPITAL_INFO = {
  name: "City Care Health System",
  address: "Main Campus, Healthcare Avenue, Blue Area",
  phone: "+92 51 8899000",
  emergency: "1122",
  website: "http://localhost:5173",
};

/**
 * Robust dispatcher:
 * 1. Dispatches confirmation directly to the customer's actual supplied email.
 * 2. If INTERNAL_HOSPITAL_EMAIL is configured, dispatches a separate staff notification.
 * 3. Gracefully handles demo SMTP limitations without dropping transactions.
 */
async function dispatchEmail({ to, subject, html, internalSubject, internalHtml }) {
  const customerEmail = String(to || "").trim();
  if (!customerEmail || !process.env.SMTP_HOST) {
    console.log("[EMAIL NOTICE] Email sending skipped - No recipient address or SMTP_HOST configured.");
    return { status: "not_sent", reason: "missing_recipient_or_smtp" };
  }

  console.log(`[EMAIL DISPATCH] Sending to customer: "${customerEmail}" | Subject: "${subject}"`);

  let customerDelivery = { status: "sent", recipient: customerEmail };

  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || `"City Care Hospital" <no-reply@demomailtrap.co>`,
      to: customerEmail,
      subject: subject,
      html: html,
    });
    console.log(`[EMAIL SUCCESS] Delivered to "${customerEmail}" | Message ID: ${info.messageId}`);
    customerDelivery.messageId = info.messageId;
  } catch (err) {
    console.error(`[EMAIL SMTP NOTICE] SMTP server rejected direct delivery to "${customerEmail}": ${err.message}`);
    customerDelivery.status = "smtp_error";
    customerDelivery.error = err.message;
  }

  // Internal Hospital Staff Notification (if configured and different from customer)
  const internalEmail = process.env.INTERNAL_HOSPITAL_EMAIL || process.env.HOSPITAL_STAFF_EMAIL;
  if (internalEmail && internalEmail.toLowerCase() !== customerEmail.toLowerCase()) {
    try {
      console.log(`[INTERNAL NOTIFICATION] Dispatching hospital staff alert to: "${internalEmail}"`);
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || `"City Care Hospital" <no-reply@demomailtrap.co>`,
        to: internalEmail,
        subject: internalSubject || `[Internal Hospital Alert] ${subject}`,
        html: internalHtml || `<p>Internal hospital alert for transaction: <b>${subject}</b></p><p>Customer: ${customerEmail}</p>${html}`,
      });
      console.log(`[INTERNAL NOTIFICATION SUCCESS] Delivered to hospital staff "${internalEmail}"`);
    } catch (intErr) {
      console.error(`[INTERNAL NOTIFICATION ERROR] Staff notification failed: ${intErr.message}`);
    }
  }

  return customerDelivery;
}

// ============================================================
// 1. DOCTOR APPOINTMENT CONFIRMATION
// ============================================================
async function sendAppointmentEmail({ patient, doctor, department, appointment }) {
  const customerEmail = patient?.email;
  if (!customerEmail) return { status: "not_sent", reason: "no_customer_email" };

  const status = appointment.status || "confirmed";
  const fee = Number(doctor.consultation_fee || 0).toLocaleString();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f766e; color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 20px;">City Care Hospital — Appointment Confirmation</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #99f6e4;">Consultation Booking Reference</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear <b>${patient.full_name}</b>,</p>
        <p>Your doctor consultation appointment has been scheduled successfully.</p>

        <div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 3px 0;"><b>Appointment ID:</b> <span style="font-family: monospace; font-weight: bold; color: #0f766e;">${appointment.appointment_code}</span></p>
          <p style="margin: 3px 0;"><b>Patient Name:</b> ${patient.full_name}</p>
          <p style="margin: 3px 0;"><b>Patient Email:</b> ${customerEmail}</p>
          <p style="margin: 3px 0;"><b>Doctor:</b> Dr. ${doctor.full_name}</p>
          <p style="margin: 3px 0;"><b>Specialty / Department:</b> ${department?.name || doctor.specialization || "General Medicine"}</p>
          <p style="margin: 3px 0;"><b>Scheduled Date:</b> ${appointment.appointment_date}</p>
          <p style="margin: 3px 0;"><b>OPD Shift Time:</b> ${appointment.appointment_time}</p>
          <p style="margin: 3px 0;"><b>Appointment Status:</b> <span style="text-transform: uppercase; font-weight: bold; color: #047857;">${status}</span></p>
          <p style="margin: 3px 0;"><b>OPD Consultation Fee:</b> Rs. ${fee} (Pay physically at Reception)</p>
        </div>

        <p style="font-size: 13px; color: #475569;">
          <b>Hospital Instructions:</b> Please arrive at the Front Desk Reception 15 minutes before your shift start time. Bring your Appointment ID <b>${appointment.appointment_code}</b> to receive your consultation token.
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 14px; font-size: 12px; color: #64748b;">
          <p style="margin: 2px 0;"><b>${HOSPITAL_INFO.name}</b></p>
          <p style="margin: 2px 0;">${HOSPITAL_INFO.address} | Phone: ${HOSPITAL_INFO.phone}</p>
          <p style="margin: 2px 0;">24/7 Emergency Helpline: ${HOSPITAL_INFO.emergency}</p>
        </div>
      </div>
    </div>
  `;

  return dispatchEmail({
    to: customerEmail,
    subject: `Appointment Confirmed [${appointment.appointment_code}] — Dr. ${doctor.full_name}`,
    html,
  });
}

// ============================================================
// 2. ONLINE PHARMACY ORDER CONFIRMATION
// ============================================================
async function sendOnlinePharmacyOrderEmail({ order, items, customerEmail, customerName }) {
  const toEmail = customerEmail || order?.customer_email;
  if (!toEmail) return { status: "not_sent", reason: "no_customer_email" };

  const name = customerName || order?.customer_name || "Valued Customer";
  const rows = (items || [])
    .map(
      (i) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.medicine_name || i.name}</td>
          <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${i.quantity}</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Rs. ${Number(i.unit_price || i.price || 0).toLocaleString()}</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Rs. ${Number(i.line_total || ((i.price || 0) * (i.quantity || 1))).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const orderTime = order?.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f766e; color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 20px;">City Care Hospital — Online Pharmacy Order</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #99f6e4;">Order Confirmation & Dispatch Notice</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear <b>${name}</b>,</p>
        <p>Thank you for ordering with City Care Hospital Online Pharmacy. Your order has been placed and is being prepared from our central pharmacy inventory.</p>

        <div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 3px 0;"><b>Order Tracking Code:</b> <span style="font-family: monospace; font-weight: bold; color: #0f766e;">${order.order_code}</span></p>
          <p style="margin: 3px 0;"><b>Customer Name:</b> ${name}</p>
          <p style="margin: 3px 0;"><b>Customer Email:</b> ${toEmail}</p>
          <p style="margin: 3px 0;"><b>Contact Phone:</b> ${order.customer_phone}</p>
          <p style="margin: 3px 0;"><b>Delivery Address:</b> ${order.delivery_address}</p>
          <p style="margin: 3px 0;"><b>Payment Mode:</b> Cash on Delivery (COD)</p>
          <p style="margin: 3px 0;"><b>Order Status:</b> <span style="text-transform: uppercase; font-weight: bold; color: #0f766e;">${order.status || "pending"}</span></p>
          <p style="margin: 3px 0;"><b>Order Date/Time:</b> ${orderTime}</p>
        </div>

        <h3 style="font-size: 14px; margin: 16px 0 8px 0; color: #0f766e;">Order Summary</h3>
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="padding: 8px;">Medicine</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <p style="font-size: 15px; margin-top: 14px; text-align: right;">
          <b>Total Payable on Delivery: Rs. ${Number(order.total_amount).toLocaleString()}</b>
        </p>

        <p style="color: #64748b; font-size: 13px;">
          You can track this delivery on our website or AI Assistant using your order code <b>${order.order_code}</b>. Our delivery rider will collect cash at your doorstep.
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 14px; font-size: 12px; color: #64748b;">
          <p style="margin: 2px 0;"><b>${HOSPITAL_INFO.name} — 24/7 Central Pharmacy</b></p>
          <p style="margin: 2px 0;">Ground Floor OPD Counter | Phone: ${HOSPITAL_INFO.phone}</p>
        </div>
      </div>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject: `Order Confirmed [${order.order_code}] — City Care Online Pharmacy`,
    html,
  });
}

// ============================================================
// 3. PHYSICAL PHARMACY SALE RECEIPT
// ============================================================
async function sendReceiptEmail({ customer, sale, items, receiptCode }) {
  const customerEmail = customer?.email;
  if (!customerEmail) return { status: "not_sent", reason: "no_customer_email" };

  const rows = (items || [])
    .map(
      (i) =>
        `<tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${i.medicine_name}</td>
          <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${i.quantity}</td>
          <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Rs. ${Number(i.unit_price).toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Rs. ${Number(i.line_total).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const saleTime = sale?.created_at ? new Date(sale.created_at).toLocaleString() : new Date().toLocaleString();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f766e; color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 20px;">City Care Hospital — Pharmacy Counter Receipt</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #99f6e4;">Physical OPD Counter Purchase</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear <b>${customer.full_name || "Valued Customer"}</b>,</p>
        <p>Thank you for purchasing at City Care Hospital 24/7 OPD Pharmacy Counter. Here is your digital receipt.</p>

        <div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 3px 0;"><b>Receipt Number:</b> <span style="font-family: monospace; font-weight: bold; color: #0f766e;">${receiptCode}</span></p>
          <p style="margin: 3px 0;"><b>Sale Reference:</b> ${sale.sale_code}</p>
          <p style="margin: 3px 0;"><b>Customer Name:</b> ${customer.full_name}</p>
          <p style="margin: 3px 0;"><b>Customer Email:</b> ${customerEmail}</p>
          <p style="margin: 3px 0;"><b>Sale Type:</b> ${sale.sale_type === "prescription" ? "Doctor Prescription Dispensing" : "Walk-in OTC"}</p>
          <p style="margin: 3px 0;"><b>Transaction Date:</b> ${saleTime}</p>
        </div>

        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="padding: 6px 8px;">Medicine</th>
              <th style="padding: 6px 8px; text-align: center;">Qty</th>
              <th style="padding: 6px 8px; text-align: right;">Unit Price</th>
              <th style="padding: 6px 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top: 14px; text-align: right; font-size: 14px;">
          ${sale.discount_amount > 0 ? `<p style="margin: 2px 0; color: #047857;">Discount: - Rs. ${Number(sale.discount_amount).toLocaleString()}</p>` : ""}
          <p style="margin: 4px 0; font-size: 16px; font-weight: bold; color: #0f766e;">Total Paid: Rs. ${Number(sale.total_amount).toLocaleString()}</p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 14px; font-size: 12px; color: #64748b;">
          <p style="margin: 2px 0;"><b>${HOSPITAL_INFO.name} — 24/7 Central Pharmacy</b></p>
          <p style="margin: 2px 0;">Ground Floor OPD Counter | Helpline: ${HOSPITAL_INFO.phone}</p>
        </div>
      </div>
    </div>
  `;

  return dispatchEmail({
    to: customerEmail,
    subject: `Pharmacy Receipt [${receiptCode}] — City Care Hospital`,
    html,
  });
}

// ============================================================
// 4. LABORATORY TEST BOOKING CONFIRMATION
// ============================================================
async function sendLabBookingEmail({ booking, tests, patientEmail, patientName }) {
  const toEmail = patientEmail || booking?.patient_email;
  if (!toEmail) return { status: "not_sent", reason: "no_customer_email" };

  const name = patientName || booking?.patient_name || "Valued Patient";
  const serviceLabel = booking?.service_type === "home_service" ? "Home Sample Collection" : "In-Clinic Diagnostic Laboratory";
  const rows = (tests || [])
    .map(
      (t) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${t.name || t.test_name}</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Rs. ${Number(t.price || 0).toLocaleString()}</td>
          <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${t.is_home_collection_available ? "Home / In-Clinic" : "In-Clinic Only"}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f766e; color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 20px;">City Care Hospital — Pathology Laboratory Booking</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #99f6e4;">Diagnostic Laboratory & Home Collection</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear <b>${name}</b>,</p>
        <p>Your clinical laboratory test appointment has been confirmed with City Care Pathology Laboratory.</p>

        <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 4px solid #0d9488; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><b>Laboratory Tracking ID:</b> <span style="font-size: 18px; font-family: monospace; font-weight: bold; color: #0f766e;">${booking.tracking_id}</span></p>
          <p style="margin: 3px 0;"><b>Booking Code:</b> ${booking.booking_code}</p>
          <p style="margin: 3px 0;"><b>Patient Name:</b> ${name}</p>
          <p style="margin: 3px 0;"><b>Patient Email:</b> ${toEmail}</p>
          <p style="margin: 3px 0;"><b>Service Mode:</b> <b>${serviceLabel}</b></p>
          <p style="margin: 3px 0;"><b>Scheduled Date:</b> ${booking.booking_date} ${booking.booking_time ? "at " + booking.booking_time : ""}</p>
          ${booking.home_address ? `<p style="margin: 3px 0;"><b>Collection Address:</b> ${booking.home_address}</p>` : ""}
          <p style="margin: 3px 0;"><b>Current Status:</b> <span style="text-transform: uppercase; font-weight: bold; color: #0f766e;">${booking.status || "pending"}</span></p>
        </div>

        <h3 style="font-size: 14px; margin: 16px 0 8px 0; color: #0f766e;">Booked Diagnostic Tests</h3>
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="padding: 8px;">Test Name</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: center;">Collection Mode</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <p style="font-size: 15px; margin-top: 14px; text-align: right;">
          <b>Total Diagnostic Fee: Rs. ${Number(booking.total_amount).toLocaleString()}</b>
        </p>

        <p style="color: #64748b; font-size: 13px;">
          You can monitor real-time sample processing and download verified pathology reports on our Laboratory portal using your tracking code <b>${booking.tracking_id}</b>.
          ${booking.service_type === "home_service" ? "Our certified phlebotomist will arrive with sterile collection equipment at your specified address." : "Please arrive 15 minutes before your scheduled appointment time at the hospital Diagnostic Laboratory reception."}
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 14px; font-size: 12px; color: #64748b;">
          <p style="margin: 2px 0;"><b>${HOSPITAL_INFO.name} — Pathology Diagnostics</b></p>
          <p style="margin: 2px 0;">${HOSPITAL_INFO.address} | Laboratory Desk: ${HOSPITAL_INFO.phone}</p>
        </div>
      </div>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject: `Lab Booking Confirmed [${booking.booking_code}] — Tracking ID: ${booking.tracking_id}`,
    html,
  });
}

module.exports = {
  sendAppointmentEmail,
  sendReceiptEmail,
  sendOnlinePharmacyOrderEmail,
  sendLabBookingEmail,
};
