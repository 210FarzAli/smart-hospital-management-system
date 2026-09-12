const nodemailer = require("nodemailer");

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

async function sendAppointmentEmail({ patient, doctor, department, appointment }) {
  if (!patient.email || !process.env.SMTP_HOST) {
    return { status: "not_sent" };
  }
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: patient.email,
      subject: `Appointment Confirmed — ${appointment.appointment_code}`,
      html: `
        <p>Dear ${patient.full_name},</p>
        <p>Your appointment is confirmed:</p>
        <ul>
          <li><b>Appointment ID:</b> ${appointment.appointment_code}</li>
          <li><b>Doctor:</b> ${doctor.full_name} (${department?.name || ""})</li>
          <li><b>Date:</b> ${appointment.appointment_date}</li>
          <li><b>OPD Shift:</b> ${appointment.appointment_time}</li>
          <li><b>Payment:</b> Pay Physically at Reception (OPD Consultation Fee: Rs. ${Number(doctor.consultation_fee || 0).toLocaleString()}). No online payment is required.</li>
        </ul>
        <p>Please arrive 15 minutes before the shift start time and pay your consultation fee at the reception counter. Thank you.</p>
      `,
    });
    return { status: "sent" };
  } catch (err) {
    console.error("Failed to send appointment email:", err.message);
    return { status: "failed" };
  }
}

async function sendReceiptEmail({ customer, sale, items, receiptCode }) {
  if (!customer?.email || !process.env.SMTP_HOST) {
    return { status: "not_sent" };
  }
  try {
    const rows = items
      .map((i) => `<tr><td>${i.medicine_name}</td><td>${i.quantity}</td><td>${i.unit_price}</td><td>${i.line_total}</td></tr>`)
      .join("");
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: customer.email,
      subject: `Pharmacy Receipt — ${sale.sale_code}`,
      html: `
        <p>Dear ${customer.full_name},</p>
        <p>Thank you for your purchase. Receipt <b>${receiptCode}</b>:</p>
        <table border="1" cellpadding="6" cellspacing="0">
          <tr><th>Medicine</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
          ${rows}
        </table>
        <p><b>Discount:</b> ${sale.discount_amount} &nbsp; <b>Total Paid:</b> ${sale.total_amount}</p>
      `,
    });
    return { status: "sent" };
  } catch (err) {
    console.error("Failed to send receipt email:", err.message);
    return { status: "failed" };
  }
}

module.exports = { sendAppointmentEmail, sendReceiptEmail };
