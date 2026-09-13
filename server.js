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
        rating: 4.8
    },
    {
        id: 2,
        name: "Amit Kumar",
        vehicle: "Auto",
        vehicleNumber: "JH01AC5678",
        rating: 4.7
    },
    {
        id: 3,
        name: "Vikas Singh",
        vehicle: "Cab",
        vehicleNumber: "JH01CD9012",
        rating: 4.9
    }
];

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "RideMini server healthy",
        status: "online"
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

    const ride = {
        id: nextRideId++,
        pickup: pickup,
        drop_location: drop_location,
        ride_type: ride_type,
        distance_km: Number(distance_km) || 0,
        fare: Number(fare) || 0,
        status: "searching",
        driver: null,
        created_at: new Date().toISOString()
    };

    rides.push(ride);

    console.log("New ride:", ride);

    res.json({
        success: true,
        ride_id: ride.id,
        status: "searching",
        message: "Driver search started"
    });

    // 5 second ke baad driver assign hoga
    setTimeout(() => {

        const currentRide = rides.find(
            r => r.id === ride.id
        );

        if (!currentRide) {
            return;
        }

        let availableDrivers = drivers.filter(
            driver =>
                driver.vehicle.toLowerCase() ===
                currentRide.ride_type.toLowerCase()
        );

        if (availableDrivers.length === 0) {
            availableDrivers = drivers;
        }

        const driver =
            availableDrivers[
                Math.floor(
                    Math.random() * availableDrivers.length
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
            "Driver assigned:",
            driver.name,
            "Ride:",
            currentRide.id
        );

    }, 5000);
});

app.get("/api/ride/:id", (req, res) => {

    const id = Number(req.params.id);

    const ride = rides.find(
        r => r.id === id
    );

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

app.get("/api/rides", (req, res) => {

    res.json({
        success: true,
        count: rides.length,
        rides: rides
    });
});

app.listen(PORT, "0.0.0.0", () => {

    console.log("================================");
    console.log("RideMini Backend Started");
    console.log("================================");
    console.log("Port:", PORT);
    console.log("Status: ONLINE");

});
