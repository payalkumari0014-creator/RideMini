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
        vehicle: "Bike",
        vehicleNumber: "JH01AB1234",
        rating: 4.8,
        online: true
    },
    {
        id: 2,
        name: "Amit Kumar",
        vehicle: "Auto",
        vehicleNumber: "JH01AC5678",
        rating: 4.7,
        online: true
    },
    {
        id: 3,
        name: "Vikas Singh",
        vehicle: "Cab",
        vehicleNumber: "JH01CD9012",
        rating: 4.9,
        online: true
    }
];

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "online",
        message: "RideMini server healthy"
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

    console.log("NEW RIDE:", ride);

    res.json({
        success: true,
        ride_id: ride.id,
        status: "searching"
    });

    setTimeout(() => {

        const currentRide = rides.find(
            r => r.id === ride.id
        );

        if (!currentRide) return;

        const matchingDrivers = drivers.filter(
            driver =>
                driver.online &&
                driver.vehicle.toLowerCase() ===
                currentRide.ride_type.toLowerCase()
        );

        if (matchingDrivers.length === 0) {
            console.log(
                "No online driver for ride:",
                currentRide.id
            );
            return;
        }

        const driver =
            matchingDrivers[
                Math.floor(
                    Math.random() * matchingDrivers.length
                )
            ];

        currentRide.status = "accepted";

        currentRide.driver = {
            id: driver.id,
            name: driver.name,
            vehicle: driver.vehicle,
            vehicleNumber: driver.vehicleNumber,
            rating: driver.rating
        };

        console.log(
            "DRIVER ASSIGNED:",
            driver.name,
            "Ride:",
            currentRide.id
        );

    }, 5000);
});


/* =========================
   GET SINGLE RIDE
========================= */

app.get("/api/ride/:id", (req, res) => {

    const id = Number(req.params.id);

    const ride = rides.find(
        r => r.id === id
    );

    if (!ride) {
        return res.status(404).json({
            success: false,
            message: "Ride not found"
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
   DRIVER LIST
========================= */

app.get("/api/drivers", (req, res) => {

    res.json({
        success: true,
        drivers
    });
});


/* =========================
   DRIVER ONLINE / OFFLINE
========================= */

app.post("/api/driver/:id/status", (req, res) => {

    const id = Number(req.params.id);

    const driver = drivers.find(
        d => d.id === id
    );

    if (!driver) {
        return res.status(404).json({
            success: false,
            message: "Driver not found"
        });
    }

    driver.online = Boolean(req.body.online);

    console.log(
        "Driver:",
        driver.name,
        "Online:",
        driver.online
    );

    res.json({
        success: true,
        driver
    });
});


/* =========================
   DRIVER ACCEPT RIDE
========================= */

app.post("/api/ride/:rideId/accept", (req, res) => {

    const rideId = Number(req.params.rideId);
    const driverId = Number(req.body.driver_id);

    const ride = rides.find(
        r => r.id === rideId
    );

    const driver = drivers.find(
        d => d.id === driverId
    );

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

    ride.status = "accepted";

    ride.driver = {
        id: driver.id,
        name: driver.name,
        vehicle: driver.vehicle,
        vehicleNumber: driver.vehicleNumber,
        rating: driver.rating
    };

    res.json({
        success: true,
        message: "Ride accepted",
        ride
    });
});


/* =========================
   DRIVER REJECT RIDE
========================= */

app.post("/api/ride/:rideId/reject", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride = rides.find(
        r => r.id === rideId
    );

    if (!ride) {
        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });
    }

    ride.status = "searching";
    ride.driver = null;

    res.json({
        success: true,
        message: "Ride rejected"
    });
});


/* =========================
   SERVER START
========================= */

app.listen(PORT, "0.0.0.0", () => {

    console.log("================================");
    console.log("RideMini Backend Started");
    console.log("================================");
    console.log("Port:", PORT);
    console.log("Status: ONLINE");

});
