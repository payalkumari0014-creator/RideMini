const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Frontend serve karega
app.use(express.static(path.join(__dirname)));

let rides = [];
let nextRideId = 1;

// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "RideMini server healthy ❤️",
        status: "online"
    });
});

// Book ride
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

    const ride = {
        id: nextRideId++,
        pickup,
        drop_location,
        ride_type,
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

// Get single ride
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
        ride
    });
});

// Get all rides
app.get("/api/rides", (req, res) => {

    res.json({
        success: true,
        count: rides.length,
        rides
    });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("================================");
    console.log("🚕 RideMini Backend Started");
    console.log("================================");
    console.log("Port:", PORT);
    console.log("Status: ONLINE");
    console.log("");
});
