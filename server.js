```javascript
const express = require("express");
const cors = require("cors");

const app = express();

// Render ka PORT automatically use hoga
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Temporary ride storage
let rides = [];
let nextRideId = 1;


// ===============================
// HOME
// ===============================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "RideMini Backend is running 🚕",
        status: "online"
    });
});


// ===============================
// BOOK RIDE
// ===============================
app.post("/api/ride", (req, res) => {

    const {
        pickup,
        drop_location,
        ride_type,
        distance_km,
        fare
    } = req.body;

    // Required fields check
    if (!pickup || !drop_location || !ride_type) {
        return res.status(400).json({
            success: false,
            message: "Pickup, drop and ride type are required"
        });
    }

    // Create ride
    const ride = {
        id: nextRideId++,
        pickup: pickup,
        drop_location: drop_location,
        ride_type: ride_type,
        distance_km: Number(distance_km) || 0,
        fare: Number(fare) || 0,
        status: "searching",
        driver_name: null,
        created_at: new Date().toISOString()
    };

    rides.push(ride);

    console.log("🚕 New Ride:", ride);

    res.json({
        success: true,
        ride_id: ride.id,
        status: ride.status,
        message: "Ride booking request sent 🚕"
    });
});


// ===============================
// GET SINGLE RIDE
// ===============================
app.get("/api/ride/:id", (req, res) => {

    const id = Number(req.params.id);

    const ride = rides.find(r => r.id === id);

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
});


// ===============================
// GET ALL RIDES
// ===============================
app.get("/api/rides", (req, res) => {

    res.json({
        success: true,
        count: rides.length,
        rides: rides
    });
});


// ===============================
// HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {

    res.json({
        success: true,
        message: "RideMini server healthy ❤️"
    });
});


// ===============================
// START SERVER
// ===============================
app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("================================");
    console.log("🚕 RideMini Backend Started");
    console.log("================================");
    console.log("Port:", PORT);
    console.log("Status: ONLINE");
    console.log("");
});
```
