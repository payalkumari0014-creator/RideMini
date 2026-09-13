const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

let rides = [];
let nextRideId = 1;

const drivers = [
    {
        id: 1,
        name: "Rahul Kumar",
        type: "Bike",
        vehicle: "JH01AB1234",
        rating: 4.8,
        online: true
    },
    {
        id: 2,
        name: "Amit Kumar",
        type: "Auto",
        vehicle: "JH01AC5678",
        rating: 4.7,
        online: true
    },
    {
        id: 3,
        name: "Vikas Singh",
        type: "Cab",
        vehicle: "JH01CD9012",
        rating: 4.9,
        online: true
    }
];

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "RideMini server healthy ❤️",
        status: "online"
    });
});

/* =========================
   GET DRIVERS
========================= */

app.get("/api/drivers", (req, res) => {
    res.json({
        success: true,
        drivers
    });
});

/* =========================
   DRIVER ONLINE/OFFLINE
========================= */

app.post("/api/driver/:id/status", (req, res) => {
    const driverId = Number(req.params.id);
    const driver = drivers.find(d => d.id === driverId);

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

/* =========================
   BOOK RIDE
========================= */

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
            message: "Pickup, drop aur ride type required hai"
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

        driver_id: null,
        driver_name: null,
        driver_vehicle: null,
        driver_rating: null,

        created_at: new Date().toISOString()
    };

    rides.push(ride);

    console.log("🚕 New Ride:", ride);

    res.json({
        success: true,
        ride_id: ride.id,
        status: ride.status,
        message: "Driver search started 🚕"
    });
});

/* =========================
   GET SINGLE RIDE
========================= */

app.get("/api/ride/:id", (req, res) => {
    const rideId = Number(req.params.id);

    const ride = rides.find(r => r.id === rideId);

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

/* =========================
   GET ALL RIDES
========================= */

app.get("/api/rides", (req, res) => {
    res.json({
        success: true,
        count: rides.length,
        rides
    });
});

/* =========================
   DRIVER ACCEPT RIDE
========================= */

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
            message: "Ride already accepted hai"
        });
    }

    if (ride.ride_type !== driver.type) {
        return res.status(400).json({
            success: false,
            message: "Ride type match nahi karta"
        });
    }

    ride.status = "accepted";

    ride.driver_id = driver.id;
    ride.driver_name = driver.name;
    ride.driver_vehicle = driver.vehicle;
    ride.driver_rating = driver.rating;

    console.log(
        `✅ Ride ${ride.id} accepted by ${driver.name}`
    );

    res.json({
        success: true,
        message: "Ride accepted 🚕",
        ride
    });
});

/* =========================
   START RIDE
========================= */

app.post("/api/ride/:rideId/start", (req, res) => {
    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);

    if (!ride) {
        return res.status(404).json({
            success: false,
            message: "Ride nahi mili"
        });
    }

    if (ride.status !== "accepted") {
        return res.status(400).json({
            success: false,
            message: "Ride start nahi ho sakti"
        });
    }

    ride.status = "started";

    console.log(`🏍️ Ride ${ride.id} started`);

    res.json({
        success: true,
        message: "Ride started 🏍️",
        ride
    });
});

/* =========================
   COMPLETE RIDE
========================= */

app.post("/api/ride/:rideId/complete", (req, res) => {
    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);

    if (!ride) {
        return res.status(404).json({
            success: false,
            message: "Ride nahi mili"
        });
    }

    if (ride.status !== "started") {
        return res.status(400).json({
            success: false,
            message: "Ride complete nahi ho sakti"
        });
    }

    ride.status = "completed";

    console.log(`🏁 Ride ${ride.id} completed`);

    res.json({
        success: true,
        message: "Ride completed 🏁",
        ride
    });
});

/* =========================
   REJECT RIDE
========================= */

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
            message: "Ride reject nahi ho sakti"
        });
    }

    ride.status = "rejected";

    console.log(`❌ Ride ${ride.id} rejected`);

    res.json({
        success: true,
        message: "Ride rejected",
        ride
    });
});

/* =========================
   CANCEL RIDE
========================= */

app.post("/api/ride/:rideId/cancel", (req, res) => {
    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);

    if (!ride) {
        return res.status(404).json({
            success: false,
            message: "Ride nahi mili"
        });
    }

    if (
        ride.status === "completed" ||
        ride.status === "cancelled"
    ) {
        return res.status(400).json({
            success: false,
            message: "Ride cancel nahi ho sakti"
        });
    }

    ride.status = "cancelled";

    console.log(`🚫 Ride ${ride.id} cancelled`);

    res.json({
        success: true,
        message: "Ride cancelled",
        ride
    });
});

/* =========================
   SERVER START
========================= */

app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("================================");
    console.log("🚕 RideMini Backend Started");
    console.log("================================");
    console.log("Port:", PORT);
    console.log("Status: ONLINE");
    console.log("================================");
});
