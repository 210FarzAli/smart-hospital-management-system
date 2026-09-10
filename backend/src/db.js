const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const config = {
  connectionString:
    "Driver={ODBC Driver 18 for SQL Server};" +
    "Server=DESKTOP-DIOA02T\\SQLEXPRESS;" +
    "Database=SmartHospitalDB;" +
    "Trusted_Connection=Yes;" +
    "Encrypt=No;" +
    "TrustServerCertificate=No;",

  options: {
    useUTC: true,
  },
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    console.log("\nConnecting to SQL Server...");
    console.log("Server: DESKTOP-DIOA02T\\SQLEXPRESS");
    console.log("Database: SmartHospitalDB");
    console.log("Authentication: Windows Authentication");
    console.log("ODBC Driver: ODBC Driver 18 for SQL Server");

    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(
          'Connected to SQL Server database "SmartHospitalDB" successfully.'
        );
        return pool;
      })
      .catch((err) => {
        poolPromise = null;

        console.error("\n========== SQL SERVER CONNECTION FAILED ==========");
        console.error("Name:", err?.name);
        console.error("Message:", err?.message);
        console.error("Code:", err?.code);
        console.error("Full error:", err);
        console.error("==================================================\n");

        throw err;
      });
  }

  return poolPromise;
}

module.exports = { sql, getPool };