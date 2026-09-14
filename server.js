const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));


// ======================================================
// SUPABASE
// ======================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error("❌ Supabase environment variables missing");
    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

console.log("✅ Supabase configuration loaded");


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", async (req, res) => {

    try {

        const { error } = await supabase
            .from("customers")
            .select("id")
            .limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                database: "error",
                message: error.message
            });
        }

        res.json({
            success: true,
            database: "connected",
            status: "online"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// CUSTOMER REGISTER
// ======================================================

app.post("/api/customer/register", async (req, res) => {

    try {

        const {
            name,
            phone
        } = req.body;

        if (!name || !phone) {

            return res.status(400).json({
                success: false,
                message: "Name and phone are required"
            });

        }

        const cleanPhone = String(phone).replace(/\D/g, "");

        if (cleanPhone.length < 10) {

            return res.status(400).json({
                success: false,
                message: "Valid phone number required"
            });

        }

        // Check existing customer

        const { data: existing, error: findError } =
            await supabase
                .from("customers")
                .select("*")
                .eq("phone", cleanPhone)
                .maybeSingle();

        if (findError) {

            return res.status(500).json({
                success: false,
                message: findError.message
            });

        }

        if (existing) {

            return res.json({
                success: true,
                message: "Customer already exists",
                customer: existing
            });

        }

        // Create customer

        const { data, error } =
            await supabase
                .from("customers")
                .insert({
                    name: String(name).trim(),
                    phone: cleanPhone
                })
                .select()
                .single();

        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

        res.json({
            success: true,
            message: "Customer registered successfully",
            customer: data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// GET CUSTOMER
// ======================================================

app.get("/api/customer/:id", async (req, res) => {

    try {

        const customerId = Number(req.params.id);

        const { data, error } =
            await supabase
                .from("customers")
                .select("*")
                .eq("id", customerId)
                .single();

        if (error || !data) {

            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });

        }

        res.json({
            success: true,
            customer: data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// DRIVER REGISTER
// ======================================================

app.post("/api/driver/register", async (req, res) => {

    try {

        const {
            name,
            phone,
            vehicle_type,
            vehicle_number
        } = req.body;

        if (
            !name ||
            !phone ||
            !vehicle_type ||
            !vehicle_number
        ) {

            return res.status(400).json({
                success: false,
                message: "All driver details are required"
            });

        }

        const cleanPhone =
            String(phone).replace(/\D/g, "");

        const cleanVehicle =
            String(vehicle_number)
                .trim()
                .toUpperCase();

        // Check existing driver

        const { data: existing, error: findError } =
            await supabase
                .from("drivers")
                .select("*")
                .or(
                    `phone.eq.${cleanPhone},vehicle_number.eq.${cleanVehicle}`
                )
                .maybeSingle();

        if (findError) {

            return res.status(500).json({
                success: false,
                message: findError.message
            });

        }

        if (existing) {

            return res.json({
                success: true,
                message: "Driver already exists",
                driver: existing
            });

        }

        // New driver

        const { data, error } =
            await supabase
                .from("drivers")
                .insert({

                    name: String(name).trim(),

                    phone: cleanPhone,

                    vehicle_type:
                        String(vehicle_type).trim(),

                    vehicle_number:
                        cleanVehicle,

                    rating: 5.0,

                    online: false,

                    status: "pending"

                })
                .select()
                .single();

        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

        res.json({
            success: true,
            message:
                "Driver registration submitted. Approval required.",

            driver: data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// GET DRIVER
// ======================================================

app.get("/api/driver/:id", async (req, res) => {

    try {

        const driverId = Number(req.params.id);

        const { data, error } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", driverId)
                .single();

        if (error || !data) {

            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });

        }

        res.json({
            success: true,
            driver: data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// GET DRIVERS
// ======================================================

app.get("/api/drivers", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("drivers")
                .select("*")
                .order("id", {
                    ascending: true
                });

        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

        res.json({
            success: true,
            drivers: data || []
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// DRIVER ONLINE / OFFLINE
// ======================================================

app.post("/api/driver/:id/status", async (req, res) => {

    try {

        const driverId = Number(req.params.id);

        const online =
            Boolean(req.body.online);

        const { data: driver, error: findError } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", driverId)
                .single();

        if (findError || !driver) {

            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });

        }

        if (driver.status !== "approved") {

            return res.status(403).json({
                success: false,
                message:
                    "Driver is not approved yet"
            });

        }

        const { data, error } =
            await supabase
                .from("drivers")
                .update({
                    online: online
                })
                .eq("id", driverId)
                .select()
                .single();

        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

        res.json({
            success: true,
            online: data.online,
            driver: data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// DRIVER GPS LOCATION
// ======================================================

app.post("/api/driver/:id/location", async (req, res) => {

    try {

        const driverId = Number(req.params.id);

        const lat = Number(req.body.lat);
        const lng = Number(req.body.lng);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {

            return res.status(400).json({
                success: false,
                message: "Valid latitude and longitude required"
            });

        }

        const { error } =
            await supabase
                .from("drivers")
                .update({
                    lat: lat,
                    lng: lng
                })
                .eq("id", driverId);

        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

        // Also update active rides of this driver

        await supabase
            .from("rides")
            .update({
                driver_lat: lat,
                driver_lng: lng
            })
            .eq("driver_id", driverId)
            .in("status", [
                "accepted",
                "started"
            ]);

        res.json({
            success: true,
            lat,
            lng
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// CREATE RIDE
// ======================================================

app.post("/api/ride", async (req, res) => {

    try {

        const {

            customer_id,

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


        if (
            !pickup ||
            !drop_location ||
            !ride_type
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Pickup, drop and ride type are required"
            });

        }


        // Customer check

        if (customer_id) {

            const { data: customer } =
                await supabase
                    .from("customers")
                    .select("id")
                    .eq("id", Number(customer_id))
                    .maybeSingle();

            if (!customer) {

                return res.status(400).json({
                    success: false,
                    message: "Customer not found"
                });

            }

        }


        // Create ride

        const rideData = {

            customer_id:
                customer_id
                    ? Number(customer_id)
                    : null,

            pickup:
                String(pickup),

            drop_location:
                String(drop_location),

            ride_type:
                String(ride_type),

            distance_km:
                Number(distance_km) || 0,

            fare:
                Number(fare) || 0,

            pickup_lat:
                Number.isFinite(Number(pickup_lat))
                    ? Number(pickup_lat)
                    : null,

            pickup_lng:
                Number.isFinite(Number(pickup_lng))
                    ? Number(pickup_lng)
                    : null,

            drop_lat:
                Number.isFinite(Number(drop_lat))
                    ? Number(drop_lat)
                    : null,

            drop_lng:
                Number.isFinite(Number(drop_lng))
                    ? Number(drop_lng)
                    : null,

            status: "searching",

            driver_id: null,

            driver_lat: null,

            driver_lng: null

        };


        const { data, error } =
            await supabase
                .from("rides")
                .insert(rideData)
                .select()
                .single();


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        console.log(
            "🚕 New Ride Created:",
            data.id
        );


        res.json({

            success: true,

            ride_id: data.id,

            status: data.status,

            ride: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// GET SINGLE RIDE
// ======================================================

app.get("/api/ride/:id", async (req, res) => {

    try {

        const rideId =
            Number(req.params.id);


        const { data: ride, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .single();


        if (error || !ride) {

            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });

        }


        let driver = null;


        if (ride.driver_id) {

            const { data: driverData } =
                await supabase
                    .from("drivers")
                    .select(
                        "id,name,phone,vehicle_type,vehicle_number,rating,online,status,lat,lng"
                    )
                    .eq("id", ride.driver_id)
                    .maybeSingle();

            driver = driverData || null;

        }


        res.json({

            success: true,

            ride: {

                ...ride,

                driver: driver

            }

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// CUSTOMER RIDE HISTORY
// ======================================================

app.get("/api/customer/:id/rides", async (req, res) => {

    try {

        const customerId =
            Number(req.params.id);


        const { data, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("customer_id", customerId)
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        res.json({

            success: true,

            count: data.length,

            rides: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// DRIVER RIDE HISTORY
// ======================================================

app.get("/api/driver/:id/rides", async (req, res) => {

    try {

        const driverId =
            Number(req.params.id);


        const { data, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("driver_id", driverId)
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        res.json({

            success: true,

            count: data.length,

            rides: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// GET SEARCHING RIDES
// ======================================================

app.get("/api/rides", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("status", "searching")
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        res.json({

            success: true,

            count: data.length,

            rides: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// ACCEPT RIDE
// ======================================================

app.post("/api/ride/:rideId/accept", async (req, res) => {

    try {

        const rideId =
            Number(req.params.rideId);

        const driverId =
            Number(req.body.driver_id);


        if (!driverId) {

            return res.status(400).json({
                success: false,
                message: "Driver ID required"
            });

        }


        // Driver check

        const { data: driver, error: driverError } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", driverId)
                .single();


        if (driverError || !driver) {

            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });

        }


        if (driver.status !== "approved") {

            return res.status(403).json({
                success: false,
                message:
                    "Driver is not approved"
            });

        }


        if (!driver.online) {

            return res.status(400).json({
                success: false,
                message:
                    "Driver is offline"
            });

        }


        // Find ride

        const { data: ride } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .single();


        if (!ride) {

            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });

        }


        if (ride.status !== "searching") {

            return res.status(409).json({
                success: false,
                message:
                    "Ride already accepted by another driver"
            });

        }


        // Vehicle matching

        if (
            ride.ride_type.toLowerCase() !==
            driver.vehicle_type.toLowerCase()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Vehicle type does not match"
            });

        }


        const { data: updatedRide, error } =
            await supabase
                .from("rides")
                .update({

                    driver_id: driverId,

                    status: "accepted",

                    driver_lat: driver.lat,

                    driver_lng: driver.lng

                })
                .eq("id", rideId)
                .eq("status", "searching")
                .select()
                .maybeSingle();


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        if (!updatedRide) {

            return res.status(409).json({
                success: false,
                message:
                    "Ride was already accepted"
            });

        }


        res.json({

            success: true,

            message: "Ride accepted",

            ride: updatedRide,

            driver: {

                id: driver.id,

                name: driver.name,

                vehicle_type:
                    driver.vehicle_type,

                vehicle_number:
                    driver.vehicle_number,

                rating:
                    driver.rating,

                lat:
                    driver.lat,

                lng:
                    driver.lng

            }

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// REJECT RIDE
// ======================================================

app.post("/api/ride/:rideId/reject", async (req, res) => {

    res.json({

        success: true,

        message: "Ride rejected"

    });

});


// ======================================================
// START RIDE
// ======================================================

app.post("/api/ride/:rideId/start", async (req, res) => {

    try {

        const rideId =
            Number(req.params.rideId);

        const driverId =
            Number(req.body.driver_id);


        const { data: ride } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .eq("driver_id", driverId)
                .single();


        if (!ride) {

            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });

        }


        if (ride.status !== "accepted") {

            return res.status(400).json({
                success: false,
                message:
                    "Ride cannot be started"
            });

        }


        const { data, error } =
            await supabase
                .from("rides")
                .update({

                    status: "started",

                    started_at:
                        new Date().toISOString()

                })
                .eq("id", rideId)
                .select()
                .single();


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        res.json({

            success: true,

            message: "Ride started",

            ride: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// COMPLETE RIDE
// ======================================================

app.post("/api/ride/:rideId/complete", async (req, res) => {

    try {

        const rideId =
            Number(req.params.rideId);

        const driverId =
            Number(req.body.driver_id);


        const { data: ride } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .eq("driver_id", driverId)
                .single();


        if (!ride) {

            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });

        }


        if (ride.status !== "started") {

            return res.status(400).json({
                success: false,
                message:
                    "Ride has not been started"
            });

        }


        const { data, error } =
            await supabase
                .from("rides")
                .update({

                    status: "completed",

                    completed_at:
                        new Date().toISOString()

                })
                .eq("id", rideId)
                .select()
                .single();


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        res.json({

            success: true,

            message: "Ride completed",

            ride: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// CANCEL RIDE
// ======================================================

app.post("/api/ride/:rideId/cancel", async (req, res) => {

    try {

        const rideId =
            Number(req.params.rideId);


        const { data, error } =
            await supabase
                .from("rides")
                .update({

                    status: "cancelled"

                })
                .eq("id", rideId)
                .in("status", [
                    "searching",
                    "accepted"
                ])
                .select()
                .maybeSingle();


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        if (!data) {

            return res.status(400).json({
                success: false,
                message:
                    "Ride cannot be cancelled"
            });

        }


        res.json({

            success: true,

            message: "Ride cancelled",

            ride: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// CUSTOMER RATING
// ======================================================

app.post("/api/ride/:rideId/rating", async (req, res) => {

    try {

        const rideId =
            Number(req.params.rideId);

        const rating =
            Number(req.body.rating);

        const review =
            req.body.review
                ? String(req.body.review)
                : "";


        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Rating must be between 1 and 5"
            });

        }


        const { data: ride } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .single();


        if (!ride) {

            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });

        }


        if (ride.status !== "completed") {

            return res.status(400).json({
                success: false,
                message:
                    "Ride is not completed"
            });

        }


        const { data, error } =
            await supabase
                .from("rides")
                .update({

                    rating: rating,

                    review: review

                })
                .eq("id", rideId)
                .select()
                .single();


        if (error) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }


        // Update driver average rating

        if (ride.driver_id) {

            const { data: ratedRides } =
                await supabase
                    .from("rides")
                    .select("rating")
                    .eq(
                        "driver_id",
                        ride.driver_id
                    )
                    .not("rating", "is", null);


            if (ratedRides && ratedRides.length) {

                const total =
                    ratedRides.reduce(
                        (sum, item) =>
                            sum + Number(item.rating),
                        0
                    );

                const average =
                    total / ratedRides.length;


                await supabase
                    .from("drivers")
                    .update({

                        rating:
                            Math.round(
                                average * 10
                            ) / 10

                    })
                    .eq(
                        "id",
                        ride.driver_id
                    );

            }

        }


        res.json({

            success: true,

            message: "Rating submitted",

            ride: data

        });


    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});


// ======================================================
// SERVER START
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "======================================"
        );

        console.log(
            "🚕 RideMini Backend Started"
        );

        console.log(
            "======================================"
        );

        console.log(
            "Port:",
            PORT
        );

        console.log(
            "Database: Supabase"
        );

        console.log(
            "Status: ONLINE"
        );

        console.log("");

    }
);
