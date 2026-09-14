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
        phone: "Available",
        online: true,
        lat: null,
        lng: null,
        last_location_update: null
    },
    {
        id: 2,
        name: "Amit Kumar",
        type: "Auto",
        vehicle: "JH01AC5678",
        rating: 4.7,
        phone: "Available",
        online: true,
        lat: null,
        lng: null,
        last_location_update: null
    },
    {
        id: 3,
        name: "Vikas Singh",
        type: "Cab",
        vehicle: "JH01CD9012",
        rating: 4.9,
        phone: "Available",
        online: true,
        lat: null,
        lng: null,
        last_location_update: null
    }
];


// =========================
// HOME
// =========================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// =========================
// HEALTH
// =========================

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "RideMini server healthy ❤️",
        status: "online"
    });
});


// =========================
// GET DRIVERS
// =========================

app.get("/api/drivers", (req, res) => {

    res.json({
        success: true,
        drivers
    });

});


// =========================
// DRIVER ONLINE / OFFLINE
// =========================

app.post("/api/driver/:id/status", (req, res) => {

    const id = Number(req.params.id);

    const driver = drivers.find(d => d.id === id);

    if (!driver) {

        return res.status(404).json({
            success: false,
            message: "Driver not found"
        });

    }

    driver.online = Boolean(req.body.online);

    res.json({
        success: true,
        driver
    });

});


// =========================
// DRIVER GPS LOCATION
// =========================

app.post("/api/driver/:id/location", (req, res) => {

    const id = Number(req.params.id);

    const driver = drivers.find(d => d.id === id);

    if (!driver) {

        return res.status(404).json({
            success: false,
            message: "Driver not found"
        });

    }

    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {

        return res.status(400).json({
            success: false,
            message: "Invalid GPS coordinates"
        });

    }

    driver.lat = lat;
    driver.lng = lng;
    driver.last_location_update = new Date().toISOString();

    console.log(
        `📍 ${driver.name} location: ${lat}, ${lng}`
    );

    res.json({
        success: true,
        message: "Driver location updated",
        driver
    });

});


// =========================
// BOOK RIDE
// =========================

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

        driver_id: null,

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


// =========================
// GET SINGLE RIDE
// =========================

app.get("/api/ride/:id", (req, res) => {

    const id = Number(req.params.id);

    const ride = rides.find(r => r.id === id);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride nahi mili"
        });

    }


    let driver = null;


    if (ride.driver_id) {

        driver =
            drivers.find(d => d.id === ride.driver_id) || null;

    }


    res.json({

        success: true,

        ride,

        driver

    });

});


// =========================
// ALL RIDES
// =========================

app.get("/api/rides", (req, res) => {

    res.json({

        success: true,

        count: rides.length,

        rides

    });

});


// =========================
// ACCEPT RIDE
// =========================

app.post("/api/ride/:rideId/accept", (req, res) => {

    const rideId = Number(req.params.rideId);

    const driverId = Number(req.body.driver_id);


    const ride =
        rides.find(r => r.id === rideId);

    const driver =
        drivers.find(d => d.id === driverId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    if (!driver) {

        return res.status(404).json({
            success: false,
            message: "Driver not found"
        });

    }


    if (ride.status !== "searching") {

        return res.status(400).json({
            success: false,
            message: "Ride already accepted"
        });

    }


    if (!driver.online) {

        return res.status(400).json({
            success: false,
            message: "Driver is offline"
        });

    }


    ride.status = "accepted";

    ride.driver_id = driver.id;

    ride.accepted_at =
        new Date().toISOString();


    console.log(
        `✅ Ride ${ride.id} accepted by ${driver.name}`
    );


    res.json({

        success: true,

        message: "Ride accepted",

        ride,

        driver

    });

});


// =========================
// REJECT RIDE
// =========================

app.post("/api/ride/:rideId/reject", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride =
        rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    if (ride.status !== "searching") {

        return res.status(400).json({
            success: false,
            message: "Ride cannot be rejected"
        });

    }


    ride.status = "rejected";


    res.json({

        success: true,

        message: "Ride rejected",

        ride

    });

});


// =========================
// START RIDE
// =========================

app.post("/api/ride/:rideId/start", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride =
        rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    if (ride.status !== "accepted") {

        return res.status(400).json({
            success: false,
            message: "Ride cannot be started"
        });

    }


    ride.status = "started";

    ride.started_at =
        new Date().toISOString();


    res.json({

        success: true,

        message: "Ride started",

        ride

    });

});


// =========================
// COMPLETE RIDE
// =========================

app.post("/api/ride/:rideId/complete", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride =
        rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    ride.status = "completed";

    ride.completed_at =
        new Date().toISOString();


    res.json({

        success: true,

        message: "Ride completed",

        ride

    });

});


// =========================
// CANCEL RIDE
// =========================

app.post("/api/ride/:rideId/cancel", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride =
        rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    ride.status = "cancelled";

    ride.cancelled_at =
        new Date().toISOString();


    res.json({

        success: true,

        message: "Ride cancelled",

        ride

    });

});


// =========================
// START SERVER
// =========================

app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("================================");
    console.log("🚕 RideMini Backend Started");
    console.log("================================");
    console.log("Port:", PORT);
    console.log("Status: ONLINE");
    console.log("");

});
