const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_IP,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ', err.message);
        process.exit(1);
    }
    console.log('Database connected');
    connection.release(); // Release the connection back to the pool
});

const db = pool.promise();

module.exports = db;
