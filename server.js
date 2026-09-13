const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let rides = [];
let nextRideId = 1;

// Demo drivers
let drivers = [
    {
        id: 1,
        name: "Rahul Kumar",
        vehicle_type: "Bike",
        vehicle_number: "JH01AB1234",
        rating: 4.8,
        online: true
    },
    {
        id: 2,
        name: "Amit Kumar",
        vehicle_type: "Auto",
        vehicle_number: "JH01AC5678",
        rating: 4.7,
        online: true
    },
    {
        id: 3,
        name: "Vikas Singh",
        vehicle_type: "Cab",
        vehicle_number: "JH01CD9012",
        rating: 4.9,
        online: true
    }
];

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Health
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "RideMini server healthy ❤️",
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

        driver: null,

        created_at: new Date().toISOString()
    };

    rides.push(ride);

    console.log("");
    console.log("================================");
    console.log("🚕 NEW RIDE REQUEST");
    console.log("================================");
    console.log("Ride ID:", ride.id);
    console.log("Pickup:", ride.pickup);
    console.log("Drop:", ride.drop_location);
    console.log("Type:", ride.ride_type);
    console.log("Fare:", ride.fare);
    console.log("================================");

    res.json({
        success: true,
        ride_id: ride.id,
        status: "searching",
        message: "Ride request sent to nearby drivers 🚕"
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
        ride
    });
});

// ===============================
// GET ALL RIDES
// ===============================

app.get("/api/rides", (req, res) => {

    res.json({
        success: true,
        count: rides.length,
        rides
    });
});

// ===============================
// GET DRIVERS
// ===============================

app.get("/api/drivers", (req, res) => {

    res.json({
        success: true,
        drivers
    });
});

// ===============================
// DRIVER ONLINE / OFFLINE
// ===============================

app.post("/api/driver/:id/status", (req, res) => {

    const id = Number(req.params.id);

    const driver = drivers.find(d => d.id === id);

    if (!driver) {
        return res.status(404).json({
            success: false,
            message: "Driver nahi mila"
        });
    }

    driver.online = Boolean(req.body.online);

    res.json({
        success: true,
        driver
    });
});

// ===============================
// DRIVER ACCEPT RIDE
// ===============================

app.post("/api/ride/:rideId/accept", (req, res) => {

    const rideId = Number(req.params.rideId);

    const driverId = Number(req.body.driver_id);

    const ride = rides.find(r => r.id === rideId);

    const driver = drivers.find(d => d.id === driverId);

    if (!ride) {
        return res.status(404).json({
            success: false,
            message: "Ride nahi mili"
        });
    }

    if (!driver) {
        return res.status(404).json({
            success: false,
            message: "Driver nahi mila"
        });
    }

    if (!driver.online) {
        return res.status(400).json({
            success: false,
            message: "Driver offline hai"
        });
    }

    if (ride.status !== "searching") {
        return res.status(400).json({
            success: false,
            message: "Ride already accepted/rejected hai"
        });
    }

    // Check vehicle type
    if (ride.ride_type !== driver.vehicle_type) {
        return res.status(400).json({
            success: false,
            message:
                "Driver vehicle ride type se match nahi karta"
        });
    }

    ride.status = "accepted";

    ride.driver = {
        id: driver.id,
        name: driver.name,
        vehicle_type: driver.vehicle_type,
        vehicle_number: driver.vehicle_number,
        rating: driver.rating
    };

    ride.accepted_at = new Date().toISOString();

    console.log("");
    console.log("================================");
    console.log("✅ RIDE ACCEPTED");
    console.log("================================");
    console.log("Ride ID:", ride.id);
    console.log("Driver:", driver.name);
    console.log("Vehicle:", driver.vehicle_number);
    console.log("================================");

    res.json({
        success: true,
        message: "Ride accepted successfully",
        ride
    });
});

// ===============================
// DRIVER REJECT RIDE
// ===============================

app.post("/api/ride/:rideId/reject", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);

    if (!ride) {
        return res.status(404).json({
            success: false,
            message: "Ride nahi mili"
        });
    }

    if (ride.status !== "searching") {
        return res.status(400).json({
            success: false,
            message: "Ride already process ho chuki hai"
        });
    }

    ride.last_rejected_driver =
        Number(req.body.driver_id) || null;

    res.json({
        success: true,
        message: "Ride rejected"
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
    console.log("Drivers:", drivers.length);
    console.log("================================");
});
