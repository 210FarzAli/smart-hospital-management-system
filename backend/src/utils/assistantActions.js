const { sql } = require("../db");
const { checkDrugInteractions } = require("./interactionChecker");

function generateOrderCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
}

function generateLabTrackingCode() {
  const year = new Date().getFullYear();
  const num = Math.floor(100000 + Math.random() * 900000);
  return `LAB-${year}-${num}`;
}

function generateBookingCode(prefix = "LB") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * 1. SEARCH PHARMACY MEDICINES
 */
async function searchPharmacyMedicines(pool, { query = "", category = "" } = {}) {
  let sqlQuery = `
    SELECT
      m.id,
      m.name,
      m.category,
      m.unit_price,
      m.reorder_level,
      m.status,
      COALESCE(SUM(CASE WHEN b.expiry_date >= CAST(GETDATE() AS DATE) THEN b.quantity ELSE 0 END), 0) AS stock_quantity
    FROM medicines m
    LEFT JOIN medicine_batches b ON b.medicine_id = m.id
    WHERE m.status = 'active'
  `;

  if (category && category.trim()) {
    const cleanCat = category.trim().replace(/'/g, "");
    sqlQuery += ` AND m.category LIKE '%${cleanCat}%'`;
  }

  if (query && query.trim()) {
    const cleanQuery = query.trim().replace(/'/g, "");
    sqlQuery += ` AND (m.name LIKE '%${cleanQuery}%' OR m.category LIKE '%${cleanQuery}%')`;
  }

  sqlQuery += `
    GROUP BY m.id, m.name, m.category, m.unit_price, m.reorder_level, m.status
    ORDER BY m.name ASC
  `;

  const result = await pool.request().query(sqlQuery);
  return result.recordset.map((med) => {
    const qty = Number(med.stock_quantity || 0);
    const reorder = Number(med.reorder_level || 10);
    let stockStatus = "in_stock";
    if (qty === 0) {
      stockStatus = "out_of_stock";
    } else if (qty <= reorder) {
      stockStatus = "low_stock";
    }

    return {
      id: med.id,
      name: med.name,
      category: med.category,
      price: Number(med.unit_price),
      unit_price: Number(med.unit_price),
      stock_quantity: qty,
      reorder_level: reorder,
      in_stock: qty > 0,
      stock_status: stockStatus,
    };
  });
}

/**
 * 2. GET PHARMACY MEDICINE
 */
async function getPharmacyMedicine(pool, { identifier = "" } = {}) {
  const clean = String(identifier || "").trim();
  if (!clean) return null;

  const result = await pool
    .request()
    .input("identifier", sql.NVarChar, `%${clean.replace(/'/g, "")}%`)
    .query(`
      SELECT TOP 1
        m.id,
        m.name,
        m.category,
        m.unit_price,
        m.reorder_level,
        m.status,
        COALESCE(SUM(CASE WHEN b.expiry_date >= CAST(GETDATE() AS DATE) THEN b.quantity ELSE 0 END), 0) AS stock_quantity
      FROM medicines m
      LEFT JOIN medicine_batches b ON b.medicine_id = m.id
      WHERE m.status = 'active'
        AND (m.name LIKE @identifier OR CAST(m.id AS NVARCHAR(50)) = '${clean.replace(/'/g, "")}')
      GROUP BY m.id, m.name, m.category, m.unit_price, m.reorder_level, m.status
    `);

  const med = result.recordset[0];
  if (!med) return null;

  const qty = Number(med.stock_quantity || 0);
  const reorder = Number(med.reorder_level || 10);
  return {
    id: med.id,
    name: med.name,
    category: med.category,
    price: Number(med.unit_price),
    unit_price: Number(med.unit_price),
    stock_quantity: qty,
    reorder_level: reorder,
    in_stock: qty > 0,
    stock_status: qty === 0 ? "out_of_stock" : qty <= reorder ? "low_stock" : "in_stock",
  };
}

/**
 * 3. CREATE PHARMACY ORDER (COD Online Order)
 */
async function createPharmacyOrder(
  pool,
  { customer_name, customer_phone, customer_email = null, delivery_address, notes = null, items = [] }
) {
  if (!customer_name || !customer_phone || !delivery_address) {
    throw new Error("Customer name, phone number, and delivery address are required.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one medicine item.");
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      let medResult;
      if (item.medicine_id) {
        medResult = await new sql.Request(transaction)
          .input("id", sql.UniqueIdentifier, item.medicine_id)
          .query("SELECT * FROM medicines WHERE id = @id AND status = 'active'");
      } else if (item.name) {
        medResult = await new sql.Request(transaction)
          .input("name", sql.NVarChar, `%${String(item.name).trim()}%`)
          .query("SELECT TOP 1 * FROM medicines WHERE name LIKE @name AND status = 'active'");
      }

      const med = medResult?.recordset[0];
      if (!med) {
        throw new Error(`Medicine "${item.name || item.medicine_id}" could not be found or is inactive.`);
      }

      // Check stock
      const stockRes = await new sql.Request(transaction)
        .input("medId", sql.UniqueIdentifier, med.id)
        .query(`
          SELECT COALESCE(SUM(quantity), 0) AS current_stock
          FROM medicine_batches
          WHERE medicine_id = @medId AND expiry_date >= CAST(GETDATE() AS DATE)
        `);

      const available = Number(stockRes.recordset[0]?.current_stock || 0);
      const reqQty = Math.max(1, Number(item.quantity || 1));

      if (available < reqQty) {
        throw new Error(`Insufficient stock for "${med.name}". Available: ${available}, Requested: ${reqQty}.`);
      }

      const price = Number(med.unit_price);
      const lineTotal = reqQty * price;
      totalAmount += lineTotal;

      validatedItems.push({
        medicine_id: med.id,
        medicine_name: med.name,
        quantity: reqQty,
        unit_price: price,
        line_total: lineTotal,
      });
    }

    const orderCode = generateOrderCode();
    const orderRequest = new sql.Request(transaction);
    const orderResult = await orderRequest
      .input("order_code", sql.NVarChar, orderCode)
      .input("customer_name", sql.NVarChar, customer_name.trim())
      .input("customer_phone", sql.NVarChar, customer_phone.trim())
      .input("customer_email", sql.NVarChar, customer_email ? customer_email.trim() : null)
      .input("delivery_address", sql.NVarChar, delivery_address.trim())
      .input("notes", sql.NVarChar, notes ? notes.trim() : null)
      .input("total_amount", sql.Decimal(12, 2), totalAmount)
      .query(`
        INSERT INTO pharmacy_online_orders (
          order_code, customer_name, customer_phone, customer_email,
          delivery_address, notes, total_amount, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @order_code, @customer_name, @customer_phone, @customer_email,
          @delivery_address, @notes, @total_amount, 'pending'
        )
      `);

    const order = orderResult.recordset[0];

    for (const line of validatedItems) {
      await new sql.Request(transaction)
        .input("order_id", sql.UniqueIdentifier, order.id)
        .input("medicine_id", sql.UniqueIdentifier, line.medicine_id)
        .input("medicine_name", sql.NVarChar, line.medicine_name)
        .input("quantity", sql.Int, line.quantity)
        .input("unit_price", sql.Decimal(10, 2), line.unit_price)
        .input("line_total", sql.Decimal(12, 2), line.line_total)
        .query(`
          INSERT INTO pharmacy_online_order_items (
            order_id, medicine_id, medicine_name, quantity, unit_price, line_total
          )
          VALUES (
            @order_id, @medicine_id, @medicine_name, @quantity, @unit_price, @line_total
          )
        `);
    }

    await transaction.commit();

    return {
      order_id: order.id,
      order_code: order.order_code,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      delivery_address: order.delivery_address,
      total_amount: Number(order.total_amount),
      status: order.status,
      items: validatedItems,
      created_at: order.created_at,
    };
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}
    throw err;
  }
}

/**
 * 4. GET PHARMACY ORDER STATUS
 */
async function getPharmacyOrderStatus(pool, { orderCode = "", phone = "" } = {}) {
  const code = String(orderCode || "").trim();
  const phoneClean = String(phone || "").trim();

  let query = "SELECT TOP 1 * FROM pharmacy_online_orders WHERE 1=1";
  if (code) {
    query += ` AND UPPER(order_code) = '${code.replace(/'/g, "").toUpperCase()}'`;
  } else if (phoneClean) {
    query += ` AND customer_phone LIKE '%${phoneClean.replace(/'/g, "")}%'`;
  } else {
    return null;
  }
  query += " ORDER BY created_at DESC";

  const result = await pool.request().query(query);
  const order = result.recordset[0];
  if (!order) return null;

  const itemsResult = await pool
    .request()
    .input("orderId", sql.UniqueIdentifier, order.id)
    .query("SELECT * FROM pharmacy_online_order_items WHERE order_id = @orderId");

  return {
    ...order,
    items: itemsResult.recordset,
  };
}

/**
 * 5. SEARCH LAB TESTS
 */
async function searchLabTests(pool, { query = "", category = "" } = {}) {
  let sqlQuery = `
    SELECT
      id,
      test_code,
      name,
      category,
      description,
      price,
      sample_type,
      normal_range,
      unit,
      turnaround_hours,
      is_home_collection_available,
      status
    FROM lab_tests
    WHERE status = 'active'
  `;

  if (category && category.trim()) {
    const cleanCat = category.trim().replace(/'/g, "");
    sqlQuery += ` AND category LIKE '%${cleanCat}%'`;
  }

  if (query && query.trim()) {
    const cleanQuery = query.trim().replace(/'/g, "");
    sqlQuery += ` AND (
      name LIKE '%${cleanQuery}%'
      OR category LIKE '%${cleanQuery}%'
      OR test_code LIKE '%${cleanQuery}%'
      OR description LIKE '%${cleanQuery}%'
    )`;
  }

  sqlQuery += " ORDER BY category, name";

  const result = await pool.request().query(sqlQuery);
  return result.recordset.map((t) => ({
    id: t.id,
    test_code: t.test_code,
    name: t.name,
    category: t.category,
    price: Number(t.price),
    sample_type: t.sample_type,
    turnaround_hours: t.turnaround_hours,
    normal_range: t.normal_range,
    unit: t.unit,
    is_home_collection_available: Boolean(t.is_home_collection_available),
    description: t.description,
  }));
}

/**
 * 6. GET LAB TEST
 */
async function getLabTest(pool, { identifier = "" } = {}) {
  const clean = String(identifier || "").trim();
  if (!clean) return null;

  const result = await pool
    .request()
    .input("clean", sql.NVarChar, `%${clean.replace(/'/g, "")}%`)
    .query(`
      SELECT TOP 1 *
      FROM lab_tests
      WHERE status = 'active'
        AND (name LIKE @clean OR test_code = '${clean.replace(/'/g, "")}' OR CAST(id AS NVARCHAR(50)) = '${clean.replace(/'/g, "")}')
    `);

  const t = result.recordset[0];
  if (!t) return null;

  return {
    id: t.id,
    test_code: t.test_code,
    name: t.name,
    category: t.category,
    price: Number(t.price),
    sample_type: t.sample_type,
    turnaround_hours: t.turnaround_hours,
    normal_range: t.normal_range,
    unit: t.unit,
    is_home_collection_available: Boolean(t.is_home_collection_available),
    description: t.description,
  };
}

/**
 * 7. CREATE LAB BOOKING
 */
async function createLabBooking(
  pool,
  {
    patient_name,
    patient_phone,
    patient_email = null,
    patient_age = null,
    patient_gender = null,
    service_type = "in_clinic",
    booking_date,
    booking_time = null,
    home_address = null,
    notes = null,
    test_ids = [],
    test_names = [],
  }
) {
  if (!patient_name || !patient_phone || !booking_date) {
    throw new Error("Patient name, phone number, and appointment date are required.");
  }

  if (service_type === "home_service" && (!home_address || !home_address.trim())) {
    throw new Error("Sample collection address is required for Home Laboratory Service.");
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // Find tests by IDs or names
    let selectedTests = [];
    if (Array.isArray(test_ids) && test_ids.length > 0) {
      const cleanIds = test_ids.map((id) => String(id).replace(/'/g, "")).join("','");
      const res = await new sql.Request(transaction).query(
        `SELECT id, name, price, normal_range, unit, is_home_collection_available FROM lab_tests WHERE id IN ('${cleanIds}')`
      );
      selectedTests = res.recordset;
    } else if (Array.isArray(test_names) && test_names.length > 0) {
      for (const tName of test_names) {
        const res = await new sql.Request(transaction)
          .input("name", sql.NVarChar, `%${String(tName).trim()}%`)
          .query(`SELECT TOP 1 id, name, price, normal_range, unit, is_home_collection_available FROM lab_tests WHERE name LIKE @name AND status = 'active'`);
        if (res.recordset[0]) {
          selectedTests.push(res.recordset[0]);
        }
      }
    }

    if (selectedTests.length === 0) {
      throw new Error("No matching laboratory tests were found. Please select or mention valid tests.");
    }

    if (service_type === "home_service") {
      const unsupported = selectedTests.filter((t) => !t.is_home_collection_available);
      if (unsupported.length > 0) {
        throw new Error(
          `Home sample collection is not available for: ${unsupported.map((t) => t.name).join(", ")}. These tests must be performed in-clinic.`
        );
      }
    }

    const totalAmount = selectedTests.reduce((sum, t) => sum + Number(t.price), 0);
    const booking_code = generateBookingCode("LB");
    const tracking_id = generateLabTrackingCode();
    const initialStatus = service_type === "home_service" ? "sample_collection_pending" : "booked";

    const bookingRequest = new sql.Request(transaction);
    const bookingResult = await bookingRequest
      .input("booking_code", sql.NVarChar, booking_code)
      .input("tracking_id", sql.NVarChar, tracking_id)
      .input("patient_name", sql.NVarChar, patient_name.trim())
      .input("patient_phone", sql.NVarChar, patient_phone.trim())
      .input("patient_email", sql.NVarChar, patient_email ? patient_email.trim() : null)
      .input("patient_age", sql.Int, patient_age ? Number(patient_age) : null)
      .input("patient_gender", sql.NVarChar, patient_gender || null)
      .input("service_type", sql.NVarChar, service_type)
      .input("booking_date", sql.Date, booking_date)
      .input("booking_time", sql.NVarChar, booking_time || null)
      .input("home_address", sql.NVarChar, home_address ? home_address.trim() : null)
      .input("notes", sql.NVarChar, notes ? notes.trim() : null)
      .input("total_amount", sql.Decimal(12, 2), totalAmount)
      .input("status", sql.NVarChar, initialStatus)
      .query(`
        INSERT INTO lab_bookings (
          booking_code, tracking_id, patient_name, patient_phone, patient_email,
          patient_age, patient_gender, service_type, booking_date, booking_time,
          home_address, notes, total_amount, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @booking_code, @tracking_id, @patient_name, @patient_phone, @patient_email,
          @patient_age, @patient_gender, @service_type, @booking_date, @booking_time,
          @home_address, @notes, @total_amount, @status
        )
      `);

    const booking = bookingResult.recordset[0];

    for (const test of selectedTests) {
      await new sql.Request(transaction)
        .input("booking_id", sql.UniqueIdentifier, booking.id)
        .input("test_id", sql.UniqueIdentifier, test.id)
        .input("test_name", sql.NVarChar, test.name)
        .input("price", sql.Decimal(10, 2), test.price)
        .input("normal_range", sql.NVarChar, test.normal_range || null)
        .input("unit", sql.NVarChar, test.unit || null)
        .query(`
          INSERT INTO lab_booking_items (
            booking_id, test_id, test_name, price, normal_range, unit, result_status
          )
          VALUES (
            @booking_id, @test_id, @test_name, @price, @normal_range, @unit, 'pending'
          )
        `);
    }

    await transaction.commit();

    return {
      booking_id: booking.id,
      booking_code: booking.booking_code,
      tracking_id: booking.tracking_id,
      patient_name: booking.patient_name,
      patient_phone: booking.patient_phone,
      service_type: booking.service_type,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      total_amount: totalAmount,
      status: booking.status,
      tests: selectedTests.map((t) => ({ id: t.id, name: t.name, price: Number(t.price) })),
    };
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}
    throw err;
  }
}

/**
 * 8. TRACK LAB BOOKING
 */
async function trackLabBooking(pool, { trackingId = "" } = {}) {
  const clean = String(trackingId || "").trim();
  if (!clean || clean.length < 4) return null;

  const bookingResult = await pool
    .request()
    .input("trackingId", sql.NVarChar, clean)
    .query(`
      SELECT
        id,
        booking_code,
        tracking_id,
        patient_name,
        patient_age,
        patient_gender,
        service_type,
        booking_date,
        booking_time,
        status,
        total_amount,
        created_at
      FROM lab_bookings
      WHERE UPPER(tracking_id) = UPPER(@trackingId)
         OR UPPER(booking_code) = UPPER(@trackingId)
    `);

  const booking = bookingResult.recordset[0];
  if (!booking) return null;

  const itemsResult = await pool
    .request()
    .input("bookingId", sql.UniqueIdentifier, booking.id)
    .query(`
      SELECT
        id,
        test_name,
        price,
        result_value,
        result_status,
        normal_range,
        unit,
        remarks,
        completed_at
      FROM lab_booking_items
      WHERE booking_id = @bookingId
      ORDER BY test_name
    `);

  return {
    ...booking,
    items: itemsResult.recordset,
  };
}

/**
 * 9. MEDICINE INTERACTION CHECK
 */
function checkInteractions({ drugs }) {
  return checkDrugInteractions(drugs);
}

module.exports = {
  searchPharmacyMedicines,
  getPharmacyMedicine,
  createPharmacyOrder,
  getPharmacyOrderStatus,
  searchLabTests,
  getLabTest,
  createLabBooking,
  trackLabBooking,
  checkInteractions,
};
