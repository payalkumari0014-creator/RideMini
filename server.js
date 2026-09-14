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
        online: false,
        lat: null,
        lng: null
    },
    {
        id: 2,
        name: "Amit Kumar",
        type: "Auto",
        vehicle: "JH01AC5678",
        rating: 4.7,
        online: false,
        lat: null,
        lng: null
    },
    {
        id: 3,
        name: "Vikas Singh",
        type: "Cab",
        vehicle: "JH01CD9012",
        rating: 4.9,
        online: false,
        lat: null,
        lng: null
    }
];


// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// ===============================
// HEALTH
// ===============================

app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "online",
        message: "RideMini server healthy ❤️"
    });
});


// ===============================
// DRIVERS
// ===============================

app.get("/api/drivers", (req, res) => {
    res.json({
        success: true,
        drivers
    });
});


// ===============================
// DRIVER ONLINE/OFFLINE
// ===============================

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


// ===============================
// DRIVER GPS LOCATION
// ===============================

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

    // Active rides me bhi latest location update
    rides.forEach(ride => {

        if (
            ride.driver_id === driver.id &&
            (
                ride.status === "accepted" ||
                ride.status === "started"
            )
        ) {
            ride.driver_lat = lat;
            ride.driver_lng = lng;
        }

    });

    res.json({
        success: true,
        lat,
        lng
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
        fare,

        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng
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

        pickup_lat: Number(pickup_lat) || null,
        pickup_lng: Number(pickup_lng) || null,

        drop_lat: Number(drop_lat) || null,
        drop_lng: Number(drop_lng) || null,

        status: "searching",

        driver_id: null,
        driver_name: null,
        vehicle_number: null,
        driver_rating: null,

        driver_lat: null,
        driver_lng: null,

        rating: null,
        review: "",

        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null

    };


    rides.push(ride);

    console.log("🚕 New Ride:", ride);


    res.json({
        success: true,
        ride_id: ride.id,
        status: ride.status,
        message: "Ride request sent 🚕"
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


    // Latest driver GPS
    if (ride.driver_id) {

        const driver = drivers.find(
            d => d.id === ride.driver_id
        );

        if (driver) {

            ride.driver_lat = driver.lat;
            ride.driver_lng = driver.lng;

        }

    }


    res.json({
        success: true,
        ride
    });

});


// ===============================
// ALL RIDES
// ===============================

app.get("/api/rides", (req, res) => {

    res.json({
        success: true,
        count: rides.length,
        rides
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


    ride.status = "accepted";

    ride.driver_id = driver.id;
    ride.driver_name = driver.name;
    ride.vehicle_number = driver.vehicle;
    ride.driver_rating = driver.rating;

    ride.driver_lat = driver.lat;
    ride.driver_lng = driver.lng;


    console.log(
        `✅ Ride ${ride.id} accepted by ${driver.name}`
    );


    res.json({
        success: true,
        message: "Ride accepted",
        ride
    });

});


// ===============================
// DRIVER REJECT
// ===============================

app.post("/api/ride/:rideId/reject", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    res.json({
        success: true,
        message: "Ride rejected"
    });

});


// ===============================
// START RIDE
// ===============================

app.post("/api/ride/:rideId/start", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);


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

    ride.started_at = new Date().toISOString();


    res.json({
        success: true,
        message: "Ride started 🚕",
        ride
    });

});


// ===============================
// COMPLETE RIDE
// ===============================

app.post("/api/ride/:rideId/complete", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    if (ride.status !== "started") {

        return res.status(400).json({
            success: false,
            message: "Ride is not started"
        });

    }


    ride.status = "completed";

    ride.completed_at = new Date().toISOString();


    console.log(`🏁 Ride ${ride.id} completed`);


    res.json({
        success: true,
        message: "Ride completed",
        ride
    });

});


// ===============================
// CANCEL RIDE
// ===============================

app.post("/api/ride/:rideId/cancel", (req, res) => {

    const rideId = Number(req.params.rideId);

    const ride = rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    ride.status = "cancelled";


    res.json({
        success: true,
        message: "Ride cancelled",
        ride
    });

});


// ===============================
// CUSTOMER RATING
// ===============================

app.post("/api/ride/:rideId/rating", (req, res) => {

    const rideId = Number(req.params.rideId);

    const rating = Number(req.body.rating);

    const review = String(req.body.review || "");


    const ride = rides.find(r => r.id === rideId);


    if (!ride) {

        return res.status(404).json({
            success: false,
            message: "Ride not found"
        });

    }


    if (ride.status !== "completed") {

        return res.status(400).json({
            success: false,
            message: "Ride complete hone ke baad rating de sakte ho"
        });

    }


    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {

        return res.status(400).json({
            success: false,
            message: "Rating 1 se 5 ke beech honi chahiye"
        });

    }


    ride.rating = rating;
    ride.review = review;


    // Driver average rating update
    if (ride.driver_id) {

        const driver = drivers.find(
            d => d.id === ride.driver_id
        );

        if (driver) {

            const completedRatings = rides
                .filter(
                    r =>
                        r.driver_id === driver.id &&
                        r.rating !== null
                )
                .map(r => Number(r.rating));

            if (completedRatings.length > 0) {

                const total =
                    completedRatings.reduce(
                        (sum, value) => sum + value,
                        0
                    );

                driver.rating =
                    Number(
                        (
                            total /
                            completedRatings.length
                        ).toFixed(1)
                    );

            }

        }

    }


    res.json({
        success: true,
        message: "Rating saved ⭐",
        ride
    });

});


// ===============================
// SERVER
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
