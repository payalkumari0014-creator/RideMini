const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 3000;

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

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));


/* =====================================================
   HOME
===================================================== */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/health", async (req, res) => {

    const { error } = await supabase
        .from("drivers")
        .select("id")
        .limit(1);

    if (error) {
        return res.status(500).json({
            success: false,
            status: "database_error",
            error: error.message
        });
    }

    res.json({
        success: true,
        status: "online",
        database: "connected",
        message: "RideMini backend is running 🚕"
    });
});


/* =====================================================
   CUSTOMER REGISTER / LOGIN
===================================================== */

app.post("/api/customer", async (req, res) => {

    try {

        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name and phone required"
            });
        }

        const cleanPhone = String(phone).replace(/\D/g, "");

        let { data: customer, error } = await supabase
            .from("customers")
            .select("*")
            .eq("phone", cleanPhone)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!customer) {

            const result = await supabase
                .from("customers")
                .insert({
                    name: String(name).trim(),
                    phone: cleanPhone
                })
                .select()
                .single();

            if (result.error) {
                throw result.error;
            }

            customer = result.data;

        } else {

            const result = await supabase
                .from("customers")
                .update({
                    name: String(name).trim()
                })
                .eq("id", customer.id)
                .select()
                .single();

            if (!result.error) {
                customer = result.data;
            }
        }

        res.json({
            success: true,
            customer
        });

    } catch (error) {

        console.error("Customer error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   GET CUSTOMER
===================================================== */

app.get("/api/customer/:id", async (req, res) => {

    const id = Number(req.params.id);

    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        return res.status(404).json({
            success: false,
            message: "Customer not found"
        });
    }

    res.json({
        success: true,
        customer: data
    });
});


/* =====================================================
   DRIVER LIST
===================================================== */

app.get("/api/drivers", async (req, res) => {

    const { data, error } = await supabase
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
        drivers: data
    });
});


/* =====================================================
   DRIVER REGISTER
===================================================== */

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

        const result = await supabase
            .from("drivers")
            .insert({
                name: String(name).trim(),
                phone: String(phone).replace(/\D/g, ""),
                vehicle_type: String(vehicle_type).trim(),
                vehicle_number: String(vehicle_number).trim().toUpperCase(),
                rating: 5.0,
                online: false,
                status: "pending"
            })
            .select()
            .single();

        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.error.message
            });
        }

        res.json({
            success: true,
            message: "Driver registration submitted",
            driver: result.data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   DRIVER ONLINE / OFFLINE
===================================================== */

app.post("/api/driver/:id/status", async (req, res) => {

    const id = Number(req.params.id);
    const { online } = req.body;

    const result = await supabase
        .from("drivers")
        .update({
            online: Boolean(online)
        })
        .eq("id", id)
        .select()
        .single();

    if (result.error) {
        return res.status(400).json({
            success: false,
            message: result.error.message
        });
    }

    res.json({
        success: true,
        driver: result.data
    });
});


/* =====================================================
   DRIVER GPS LOCATION
===================================================== */

app.post("/api/driver/:id/location", async (req, res) => {

    const id = Number(req.params.id);

    const {
        lat,
        lng
    } = req.body;

    if (
        typeof lat !== "number" ||
        typeof lng !== "number"
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid GPS coordinates"
        });
    }

    const result = await supabase
        .from("drivers")
        .update({
            lat,
            lng
        })
        .eq("id", id)
        .select()
        .single();

    if (result.error) {
        return res.status(400).json({
            success: false,
            message: result.error.message
        });
    }

    res.json({
        success: true,
        driver: result.data
    });
});


/* =====================================================
   CREATE RIDE
===================================================== */

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
                message: "Pickup, drop and ride type are required"
            });
        }

        const rideData = {

            customer_id:
                customer_id
                    ? Number(customer_id)
                    : null,

            pickup,
            drop_location,

            ride_type,

            distance_km:
                Number(distance_km) || 0,

            fare:
                Number(fare) || 0,

            pickup_lat:
                typeof pickup_lat === "number"
                    ? pickup_lat
                    : null,

            pickup_lng:
                typeof pickup_lng === "number"
                    ? pickup_lng
                    : null,

            drop_lat:
                typeof drop_lat === "number"
                    ? drop_lat
                    : null,

            drop_lng:
                typeof drop_lng === "number"
                    ? drop_lng
                    : null,

            status: "searching"
        };

        const result = await supabase
            .from("rides")
            .insert(rideData)
            .select()
            .single();

        if (result.error) {
            throw result.error;
        }

        console.log("🚕 New Ride:", result.data.id);

        res.json({
            success: true,
            ride_id: result.data.id,
            status: result.data.status,
            message: "Ride request sent 🚕"
        });

    } catch (error) {

        console.error("Ride creation error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   GET SINGLE RIDE
===================================================== */

app.get("/api/ride/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        const { data: ride, error } = await supabase
            .from("rides")
            .select(`
                *,
                customers (
                    id,
                    name,
                    phone
                ),
                drivers (
                    id,
                    name,
                    phone,
                    vehicle_type,
                    vehicle_number,
                    rating,
                    online,
                    status,
                    lat,
                    lng
                )
            `)
            .eq("id", id)
            .single();

        if (error || !ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        res.json({
            success: true,
            ride
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   ALL RIDES
===================================================== */

app.get("/api/rides", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("rides")
            .select(`
                *,
                customers (
                    id,
                    name,
                    phone
                ),
                drivers (
                    id,
                    name,
                    phone,
                    vehicle_type,
                    vehicle_number,
                    rating,
                    online,
                    status,
                    lat,
                    lng
                )
            `)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
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


/* =====================================================
   CUSTOMER RIDE HISTORY
===================================================== */

app.get("/api/customer/:id/rides", async (req, res) => {

    try {

        const customerId = Number(req.params.id);

        const { data, error } = await supabase
            .from("rides")
            .select(`
                *,
                drivers (
                    id,
                    name,
                    vehicle_type,
                    vehicle_number,
                    rating
                )
            `)
            .eq("customer_id", customerId)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
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


/* =====================================================
   DRIVER RIDE HISTORY
===================================================== */

app.get("/api/driver/:id/rides", async (req, res) => {

    try {

        const driverId = Number(req.params.id);

        const { data, error } = await supabase
            .from("rides")
            .select(`
                *,
                customers (
                    id,
                    name,
                    phone
                )
            `)
            .eq("driver_id", driverId)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
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


/* =====================================================
   DRIVER ACCEPT RIDE
===================================================== */

app.post("/api/ride/:rideId/accept", async (req, res) => {

    try {

        const rideId = Number(req.params.rideId);
        const driverId = Number(req.body.driver_id);

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: "Driver ID required"
            });
        }

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
                message: "Driver is not approved"
            });
        }

        if (!driver.online) {
            return res.status(400).json({
                success: false,
                message: "Driver is offline"
            });
        }

        const { data: ride } = await supabase
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
            return res.status(400).json({
                success: false,
                message: "Ride already accepted"
            });
        }

        const result = await supabase
            .from("rides")
            .update({
                driver_id: driver.id,
                driver_lat: driver.lat,
                driver_lng: driver.lng,
                status: "accepted"
            })
            .eq("id", rideId)
            .eq("status", "searching")
            .select()
            .single();

        if (result.error) {
            throw result.error;
        }

        res.json({
            success: true,
            message: "Ride accepted 🚕",
            ride: result.data
        });

    } catch (error) {

        console.error("Accept error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   REJECT RIDE
===================================================== */

app.post("/api/ride/:rideId/reject", async (req, res) => {

    res.json({
        success: true,
        message: "Ride rejected"
    });
});


/* =====================================================
   START RIDE
===================================================== */

app.post("/api/ride/:rideId/start", async (req, res) => {

    try {

        const rideId = Number(req.params.rideId);

        const result = await supabase
            .from("rides")
            .update({
                status: "started",
                started_at: new Date().toISOString()
            })
            .eq("id", rideId)
            .eq("status", "accepted")
            .select()
            .single();

        if (result.error) {
            throw result.error;
        }

        res.json({
            success: true,
            message: "Ride started 🟢",
            ride: result.data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   COMPLETE RIDE
===================================================== */

app.post("/api/ride/:rideId/complete", async (req, res) => {

    try {

        const rideId = Number(req.params.rideId);

        const result = await supabase
            .from("rides")
            .update({
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("id", rideId)
            .eq("status", "started")
            .select()
            .single();

        if (result.error) {
            throw result.error;
        }

        res.json({
            success: true,
            message: "Ride completed 🏁",
            ride: result.data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   CANCEL RIDE
===================================================== */

app.post("/api/ride/:rideId/cancel", async (req, res) => {

    try {

        const rideId = Number(req.params.rideId);

        const result = await supabase
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
            .single();

        if (result.error) {
            throw result.error;
        }

        res.json({
            success: true,
            message: "Ride cancelled",
            ride: result.data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   RATING
===================================================== */

app.post("/api/ride/:rideId/rating", async (req, res) => {

    try {

        const rideId = Number(req.params.rideId);

        const rating = Number(req.body.rating);
        const review = req.body.review || "";

        if (
            rating < 1 ||
            rating > 5
        ) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const { data: ride, error: rideError } =
            await supabase
                .from("rides")
                .select("driver_id,status")
                .eq("id", rideId)
                .single();

        if (rideError || !ride) {
            return res.status(404).json({
                success: false,
                message: "Ride not found"
            });
        }

        if (ride.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Ride is not completed"
            });
        }

        const result = await supabase
            .from("rides")
            .update({
                rating,
                review
            })
            .eq("id", rideId)
            .select()
            .single();

        if (result.error) {
            throw result.error;
        }

        /* Update driver's average rating */

        if (ride.driver_id) {

            const { data: ratings } =
                await supabase
                    .from("rides")
                    .select("rating")
                    .eq("driver_id", ride.driver_id)
                    .not("rating", "is", null);

            if (ratings && ratings.length > 0) {

                const total = ratings.reduce(
                    (sum, item) =>
                        sum + Number(item.rating),
                    0
                );

                const average =
                    Math.round(
                        (total / ratings.length) * 10
                    ) / 10;

                await supabase
                    .from("drivers")
                    .update({
                        rating: average
                    })
                    .eq("id", ride.driver_id);
            }
        }

        res.json({
            success: true,
            message: "Rating saved ⭐",
            ride: result.data
        });

    } catch (error) {

        console.error("Rating error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


/* =====================================================
   SERVER
===================================================== */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log("=================================");
        console.log("🚕 RideMini Backend");
        console.log("=================================");
        console.log("Port:", PORT);
        console.log("Supabase:", "CONNECTED");
        console.log("Database:", "ONLINE");
        console.log("=================================");
        console.log("");
    }
);
