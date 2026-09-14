```javascript
const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// SUPABASE
// ===============================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error("Supabase environment variables missing.");
    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

// ===============================
// STATIC FILES
// ===============================

app.use(express.static(__dirname));

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// HEALTH
// ===============================

app.get("/health", async (req, res) => {
    try {
        const { error } = await supabase
            .from("drivers")
            .select("id")
            .limit(1);

        if (error) throw error;

        res.json({
            ok: true,
            message: "RideMini backend + Supabase working"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            ok: false,
            error: "Database connection failed"
        });
    }
});

// ===============================
// AUTO APPROVE AFTER 2 MINUTES
// ===============================

async function autoApproveDriver(driver) {

    if (!driver) {
        return driver;
    }

    if (driver.status !== "pending") {
        return driver;
    }

    if (!driver.created_at) {
        return driver;
    }

    const created =
        new Date(driver.created_at).getTime();

    const now = Date.now();

    const TWO_MINUTES =
        2 * 60 * 1000;

    if (now - created >= TWO_MINUTES) {

        const { data, error } =
            await supabase
                .from("drivers")
                .update({
                    status: "approved"
                })
                .eq("id", driver.id)
                .eq("status", "pending")
                .select()
                .single();

        if (!error && data) {

            console.log(
                "Driver auto approved:",
                data.id
            );

            return data;
        }
    }

    return driver;
}

// ===============================
// CUSTOMER REGISTER
// ===============================

app.post("/api/customer/register", async (req, res) => {

    try {

        const name =
            String(req.body.name || "").trim();

        const phone =
            String(req.body.phone || "").trim();

        if (!name || !phone) {

            return res.status(400).json({
                error: "Name and phone are required."
            });
        }

        const { data: existing } =
            await supabase
                .from("customers")
                .select("*")
                .eq("phone", phone)
                .maybeSingle();

        if (existing) {

            return res.json({
                success: true,
                customer: existing,
                existing: true
            });
        }

        const { data, error } =
            await supabase
                .from("customers")
                .insert({
                    name,
                    phone
                })
                .select()
                .single();

        if (error) throw error;

        res.json({
            success: true,
            customer: data
        });

    } catch (error) {

        console.error(
            "Customer register:",
            error
        );

        res.status(500).json({
            error: "Customer registration failed."
        });
    }
});

// ===============================
// GET CUSTOMER
// ===============================

app.get("/api/customer/:id", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("customers")
                .select("*")
                .eq("id", req.params.id)
                .maybeSingle();

        if (error) throw error;

        if (!data) {

            return res.status(404).json({
                error: "Customer not found."
            });
        }

        res.json({
            customer: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Unable to get customer."
        });
    }
});

// ===============================
// OTP GENERATOR
// ===============================

function generateOTP() {

    return Math.floor(
        100000 +
        Math.random() * 900000
    ).toString();
}

// ===============================
// DRIVER SEND OTP
// ===============================

app.post("/api/driver/send-otp", async (req, res) => {

    try {

        const phone =
            String(req.body.phone || "").trim();

        if (!/^[6-9][0-9]{9}$/.test(phone)) {

            return res.status(400).json({
                error:
                    "Enter valid 10 digit Indian mobile number."
            });
        }

        const otp = generateOTP();

        const expiresAt =
            new Date(
                Date.now() + 5 * 60 * 1000
            ).toISOString();

        await supabase
            .from("driver_otps")
            .delete()
            .eq("phone", phone);

        const { error } =
            await supabase
                .from("driver_otps")
                .insert({
                    phone,
                    otp,
                    verified: false,
                    expires_at: expiresAt
                });

        if (error) {

            console.error(error);

            return res.status(500).json({
                error:
                    "OTP table error. Check driver_otps table."
            });
        }

        console.log(
            "Driver OTP:",
            phone,
            otp
        );

        res.json({
            success: true,
            message: "OTP generated.",
            demo_otp: otp,
            expires_in: 300
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "OTP service error."
        });
    }
});

// ===============================
// DRIVER VERIFY OTP
// ===============================

app.post("/api/driver/verify-otp", async (req, res) => {

    try {

        const phone =
            String(req.body.phone || "").trim();

        const otp =
            String(req.body.otp || "").trim();

        if (!/^[6-9][0-9]{9}$/.test(phone)) {

            return res.status(400).json({
                error: "Invalid mobile number."
            });
        }

        if (!/^[0-9]{6}$/.test(otp)) {

            return res.status(400).json({
                error: "Enter 6 digit OTP."
            });
        }

        const { data, error } =
            await supabase
                .from("driver_otps")
                .select("*")
                .eq("phone", phone)
                .eq("otp", otp)
                .eq("verified", false)
                .order("created_at", {
                    ascending: false
                })
                .limit(1)
                .maybeSingle();

        if (error) throw error;

        if (!data) {

            return res.status(400).json({
                error: "Wrong OTP."
            });
        }

        if (
            new Date(data.expires_at).getTime()
            < Date.now()
        ) {

            return res.status(400).json({
                error:
                    "OTP expired. Request new OTP."
            });
        }

        const { error: updateError } =
            await supabase
                .from("driver_otps")
                .update({
                    verified: true
                })
                .eq("id", data.id);

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: "Mobile number verified."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "OTP verification failed."
        });
    }
});

// ===============================
// DRIVER REGISTER
// ===============================

app.post("/api/driver/register", async (req, res) => {

    try {

        const name =
            String(req.body.name || "").trim();

        const phone =
            String(req.body.phone || "").trim();

        const vehicle_type =
            String(req.body.vehicle_type || "").trim();

        const vehicle_number =
            String(req.body.vehicle_number || "")
                .trim()
                .toUpperCase();

        if (
            !name ||
            !phone ||
            !vehicle_type ||
            !vehicle_number
        ) {

            return res.status(400).json({
                error:
                    "All driver details are required."
            });
        }

        const { data: existing } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("phone", phone)
                .maybeSingle();

        if (existing) {

            const driver =
                await autoApproveDriver(existing);

            return res.json({
                success: true,
                driver,
                existing: true
            });
        }

        const { data: vehicleExists } =
            await supabase
                .from("drivers")
                .select("id")
                .eq(
                    "vehicle_number",
                    vehicle_number
                )
                .maybeSingle();

        if (vehicleExists) {

            return res.status(400).json({
                error:
                    "This vehicle number is already registered."
            });
        }

        const { data, error } =
            await supabase
                .from("drivers")
                .insert({
                    name,
                    phone,
                    vehicle_type,
                    vehicle_number,
                    rating: 5.0,
                    online: false,
                    status: "pending",
                    lat: null,
                    lng: null
                })
                .select()
                .single();

        if (error) throw error;

        res.json({
            success: true,
            message:
                "Driver registered. Approval pending.",
            driver: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Driver registration failed."
        });
    }
});

// ===============================
// GET DRIVER
// ===============================

app.get("/api/driver/:id", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", req.params.id)
                .maybeSingle();

        if (error) throw error;

        if (!data) {

            return res.status(404).json({
                error: "Driver not found."
            });
        }

        const driver =
            await autoApproveDriver(data);

        res.json({
            driver
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to get driver."
        });
    }
});

// ===============================
// ALL DRIVERS
// ===============================

app.get("/api/drivers", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("drivers")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        const drivers = [];

        for (const driver of data || []) {

            drivers.push(
                await autoApproveDriver(driver)
            );
        }

        res.json({
            drivers
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to get drivers."
        });
    }
});

// ===============================
// DRIVER ONLINE / OFFLINE
// ===============================

app.post("/api/driver/:id/status", async (req, res) => {

    try {

        const driverId =
            req.params.id;

        const online =
            req.body.online === true;

        const { data, error } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", driverId)
                .maybeSingle();

        if (error) throw error;

        if (!data) {

            return res.status(404).json({
                error:
                    "Driver not found."
            });
        }

        const driver =
            await autoApproveDriver(data);

        if (driver.status !== "approved") {

            return res.status(403).json({
                error:
                    "Driver is still pending approval."
            });
        }

        const { data: updated, error: updateError } =
            await supabase
                .from("drivers")
                .update({
                    online
                })
                .eq("id", driverId)
                .select()
                .single();

        if (updateError) throw updateError;

        res.json({
            success: true,
            driver: updated
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to change driver status."
        });
    }
});

// ===============================
// DRIVER LOCATION
// ===============================

app.post("/api/driver/:id/location", async (req, res) => {

    try {

        const driverId =
            req.params.id;

        const lat =
            Number(req.body.lat);

        const lng =
            Number(req.body.lng);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {

            return res.status(400).json({
                error:
                    "Invalid latitude or longitude."
            });
        }

        const { data, error } =
            await supabase
                .from("drivers")
                .update({
                    lat,
                    lng
                })
                .eq("id", driverId)
                .select()
                .single();

        if (error) throw error;

        const { data: rides } =
            await supabase
                .from("rides")
                .select("id")
                .eq("driver_id", driverId)
                .in("status", [
                    "accepted",
                    "started"
                ]);

        for (const ride of rides || []) {

            await supabase
                .from("rides")
                .update({
                    driver_lat: lat,
                    driver_lng: lng
                })
                .eq("id", ride.id);
        }

        res.json({
            success: true,
            lat,
            lng,
            driver: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to update driver location."
        });
    }
});

// ===============================
// CREATE RIDE
// ===============================

app.post("/api/ride", async (req, res) => {

    try {

        const customer_id =
            Number(req.body.customer_id);

        const pickup =
            String(req.body.pickup || "").trim();

        const drop_location =
            String(
                req.body.drop_location || ""
            ).trim();

        const ride_type =
            String(
                req.body.ride_type || "Bike"
            ).trim();

        const distance_km =
            Number(
                req.body.distance_km || 0
            );

        const fare =
            Number(
                req.body.fare || 0
            );

        const pickup_lat =
            Number(req.body.pickup_lat);

        const pickup_lng =
            Number(req.body.pickup_lng);

        const drop_lat =
            Number(req.body.drop_lat);

        const drop_lng =
            Number(req.body.drop_lng);

        if (
            !customer_id ||
            !pickup ||
            !drop_location
        ) {

            return res.status(400).json({
                error:
                    "Customer, pickup and drop are required."
            });
        }

        const { data: customer } =
            await supabase
                .from("customers")
                .select("id")
                .eq("id", customer_id)
                .maybeSingle();

        if (!customer) {

            return res.status(400).json({
                error:
                    "Customer not found."
            });
        }

        const { data, error } =
            await supabase
                .from("rides")
                .insert({

                    customer_id,

                    driver_id: null,

                    pickup,

                    drop_location,

                    ride_type,

                    distance_km:
                        Number.isFinite(distance_km)
                            ? distance_km
                            : null,

                    fare:
                        Number.isFinite(fare)
                            ? fare
                            : null,

                    pickup_lat:
                        Number.isFinite(pickup_lat)
                            ? pickup_lat
                            : null,

                    pickup_lng:
                        Number.isFinite(pickup_lng)
                            ? pickup_lng
                            : null,

                    drop_lat:
                        Number.isFinite(drop_lat)
                            ? drop_lat
                            : null,

                    drop_lng:
                        Number.isFinite(drop_lng)
                            ? drop_lng
                            : null,

                    status: "searching",

                    driver_lat: null,

                    driver_lng: null
                })
                .select()
                .single();

        if (error) throw error;

        res.json({
            success: true,
            ride: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to create ride."
        });
    }
});

// ===============================
// GET RIDE
// ===============================

app.get("/api/ride/:id", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("rides")
                .select(`
                    *,
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
                .eq("id", req.params.id)
                .maybeSingle();

        if (error) throw error;

        if (!data) {

            return res.status(404).json({
                error:
                    "Ride not found."
            });
        }

        res.json({
            ride: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to get ride."
        });
    }
});

// ===============================
// SEARCHING RIDES
// ===============================

app.get("/api/rides", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("status", "searching")
                .order("created_at", {
                    ascending: true
                });

        if (error) throw error;

        res.json({
            rides: data || []
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to get ride requests."
        });
    }
});

// ===============================
// ACCEPT RIDE
// ===============================

app.post("/api/ride/:rideId/accept", async (req, res) => {

    try {

        const rideId =
            req.params.rideId;

        const driver_id =
            Number(req.body.driver_id);

        const { data: driverData, error } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", driver_id)
                .maybeSingle();

        if (error) throw error;

        if (!driverData) {

            return res.status(404).json({
                error:
                    "Driver not found."
            });
        }

        const driver =
            await autoApproveDriver(
                driverData
            );

        if (driver.status !== "approved") {

            return res.status(403).json({
                error:
                    "Driver is not approved yet."
            });
        }

        if (!driver.online) {

            return res.status(403).json({
                error:
                    "Driver is offline."
            });
        }

        const { data: ride, error: rideError } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .maybeSingle();

        if (rideError) throw rideError;

        if (!ride) {

            return res.status(404).json({
                error:
                    "Ride not found."
            });
        }

        if (ride.status !== "searching") {

            return res.status(400).json({
                error:
                    "Ride already accepted."
            });
        }

        if (
            ride.ride_type &&
            driver.vehicle_type &&
            ride.ride_type.toLowerCase()
            !== driver.vehicle_type.toLowerCase()
        ) {

            return res.status(400).json({
                error:
                    "Vehicle type does not match."
            });
        }

        const { data: updatedRide, error: updateError } =
            await supabase
                .from("rides")
                .update({

                    driver_id,

                    status: "accepted",

                    driver_lat:
                        driver.lat,

                    driver_lng:
                        driver.lng
                })
                .eq("id", rideId)
                .eq("status", "searching")
                .select()
                .maybeSingle();

        if (updateError) throw updateError;

        if (!updatedRide) {

            return res.status(409).json({
                error:
                    "Ride was already accepted."
            });
        }

        res.json({
            success: true,
            ride: updatedRide
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to accept ride."
        });
    }
});

// ===============================
// REJECT
// ===============================

app.post("/api/ride/:rideId/reject", async (req, res) => {

    res.json({
        success: true,
        message: "Ride rejected."
    });
});

// ===============================
// START RIDE
// ===============================

app.post("/api/ride/:rideId/start", async (req, res) => {

    try {

        const rideId =
            req.params.rideId;

        const driver_id =
            Number(req.body.driver_id);

        const { data: ride, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .maybeSingle();

        if (error) throw error;

        if (!ride) {

            return res.status(404).json({
                error:
                    "Ride not found."
            });
        }

        if (
            Number(ride.driver_id)
            !== driver_id
        ) {

            return res.status(403).json({
                error:
                    "Wrong driver."
            });
        }

        if (ride.status !== "accepted") {

            return res.status(400).json({
                error:
                    "Ride cannot be started."
            });
        }

        const { data, error: updateError } =
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

        if (updateError) throw updateError;

        res.json({
            success: true,
            ride: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to start ride."
        });
    }
});

// ===============================
// COMPLETE RIDE
// ===============================

app.post("/api/ride/:rideId/complete", async (req, res) => {

    try {

        const rideId =
            req.params.rideId;

        const driver_id =
            Number(req.body.driver_id);

        const { data: ride, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .maybeSingle();

        if (error) throw error;

        if (!ride) {

            return res.status(404).json({
                error:
                    "Ride not found."
            });
        }

        if (
            Number(ride.driver_id)
            !== driver_id
        ) {

            return res.status(403).json({
                error:
                    "Wrong driver."
            });
        }

        if (ride.status !== "started") {

            return res.status(400).json({
                error:
                    "Ride must be started first."
            });
        }

        const { data, error: updateError } =
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

        if (updateError) throw updateError;

        res.json({
            success: true,
            ride: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to complete ride."
        });
    }
});

// ===============================
// CANCEL RIDE
// ===============================

app.post("/api/ride/:rideId/cancel", async (req, res) => {

    try {

        const rideId =
            req.params.rideId;

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

        if (error) throw error;

        if (!data) {

            return res.status(400).json({
                error:
                    "Ride cannot be cancelled."
            });
        }

        res.json({
            success: true,
            ride: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to cancel ride."
        });
    }
});

// ===============================
// CUSTOMER HISTORY
// ===============================

app.get("/api/customer/:id/history", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("rides")
                .select(`
                    *,
                    drivers (
                        id,
                        name,
                        phone,
                        vehicle_type,
                        vehicle_number,
                        rating
                    )
                `)
                .eq(
                    "customer_id",
                    req.params.id
                )
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        res.json({
            rides: data || []
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to load customer history."
        });
    }
});

// ===============================
// DRIVER HISTORY
// ===============================

app.get("/api/driver/:id/history", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq(
                    "driver_id",
                    req.params.id
                )
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        res.json({
            rides: data || []
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to load driver history."
        });
    }
});

// ===============================
// RATING
// ===============================

app.post("/api/ride/:rideId/rating", async (req, res) => {

    try {

        const rideId =
            req.params.rideId;

        const rating =
            Number(req.body.rating);

        const review =
            String(
                req.body.review || ""
            ).trim();

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {

            return res.status(400).json({
                error:
                    "Rating must be between 1 and 5."
            });
        }

        const { data: ride, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", rideId)
                .maybeSingle();

        if (error) throw error;

        if (!ride) {

            return res.status(404).json({
                error:
                    "Ride not found."
            });
        }

        const { data, error: updateError } =
            await supabase
                .from("rides")
                .update({
                    rating,
                    review
                })
                .eq("id", rideId)
                .select()
                .single();

        if (updateError) throw updateError;

        if (ride.driver_id) {

            const { data: ratedRides } =
                await supabase
                    .from("rides")
                    .select("rating")
                    .eq(
                        "driver_id",
                        ride.driver_id
                    )
                    .not(
                        "rating",
                        "is",
                        null
                    );

            if (
                ratedRides &&
                ratedRides.length > 0
            ) {

                const total =
                    ratedRides.reduce(
                        (sum, item) =>
                            sum +
                            Number(item.rating),
                        0
                    );

                const average =
                    total /
                    ratedRides.length;

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
            ride: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                "Unable to save rating."
        });
    }
});

// ===============================
// API 404
// ===============================

app.use("/api", (req, res) => {

    res.status(404).json({
        error:
            "API endpoint not found."
    });
});

// ===============================
// SERVER START
// ===============================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {
        console.log(
            `RideMini server running on port ${PORT}`
        );
    }
);
```
