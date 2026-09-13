const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./ridemini.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS rides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pickup TEXT,
            drop_location TEXT,
            ride_type TEXT,
            distance_km REAL,
            fare REAL,
            status TEXT,
            driver_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

app.get("/", (req, res) => {
    res.json({
        message: "RideMini Backend is running 🚕"
    });
});

app.post("/api/ride", (req, res) => {

    const {
        pickup,
        drop_location,
        ride_type,
        distance_km,
        fare
    } = req.body;

    if (!pickup || !drop_location || !ride_type) {
        return res.status(400).json({
            success: false,
            message: "Pickup, drop and ride type are required"
        });
    }

    const sql = `
        INSERT INTO rides
        (pickup, drop_location, ride_type, distance_km, fare, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            pickup,
            drop_location,
            ride_type,
            distance_km || 0,
            fare || 0,
            "searching"
        ],
        function (err) {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Ride save nahi hui"
                });
            }

            res.json({
                success: true,
                ride_id: this.lastID,
                status: "searching",
                message: "Ride booking request sent 🚕"
            });
        }
    );
});

app.get("/api/ride/:id", (req, res) => {

    const id = req.params.id;

    db.get(
        "SELECT * FROM rides WHERE id = ?",
        [id],
        (err, ride) => {

            if (err) {
                return res.status(500).json({
                    success: false
                });
            }

            if (!ride) {
                return res.status(404).json({
                    success: false,
                    message: "Ride nahi mili"
                });
            }

            res.json({
                success: true,
                ride: ride
            });
        }
    );
});

app.get("/api/rides", (req, res) => {

    db.all(
        "SELECT * FROM rides ORDER BY id DESC",
        [],
        (err, rides) => {

            if (err) {
                return res.status(500).json({
                    success: false
                });
            }

            res.json({
                success: true,
                rides: rides
            });
        }
    );
});

app.listen(PORT, () => {
    console.log("");
    console.log("🚕 RideMini Backend Started");
    console.log(`Server: http://localhost:${PORT}`);
    console.log("");
});