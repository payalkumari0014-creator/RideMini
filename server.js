const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error("Supabase environment variables missing");
    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);


/* =========================
   HEALTH
========================= */

app.get("/health", async (req, res) => {
    try {
        const { error } = await supabase
            .from("customers")
            .select("id")
            .limit(1);

        if (error) {
            return res.status(500).json({
                ok: false,
                error: error.message
            });
        }

        res.json({
            ok: true,
            message: "RideMini backend + Supabase working"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});


/* =========================
   AUTO APPROVE DRIVER
========================= */

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

    const createdTime =
        new Date(driver.created_at).getTime();

    const currentTime =
        Date.now();

    const twoMinutes =
        2 * 60 * 1000;

    if (
        currentTime - createdTime >=
        twoMinutes
    ) {

        const { data, error } =
            await supabase
                .from("drivers")
                .update({
                    status: "approved"
                })
                .eq("id", driver.id)
                .eq("status", "pending")
                .select()
                .maybeSingle();

        if (!error && data) {
            return data;
        }

        if (!error && !data) {
            const { data: latest } =
                await supabase
                    .from("drivers")
                    .select("*")
                    .eq("id", driver.id)
                    .maybeSingle();

            return latest || driver;
        }
    }

    return driver;
}


/* =========================
   CUSTOMER REGISTER
========================= */

app.post("/api/customer/register", async (req, res) => {

    try {

        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                error: "Name and phone required"
            });
        }

        const cleanPhone =
            String(phone).replace(/\D/g, "");

        if (cleanPhone.length < 10) {
            return res.status(400).json({
                error: "Invalid phone number"
            });
        }

        const { data: existing, error: findError } =
            await supabase
                .from("customers")
                .select("*")
                .eq("phone", cleanPhone)
                .maybeSingle();

        if (findError) {
            return res.status(500).json({
                error: findError.message
            });
        }

        if (existing) {
            return res.json({
                success: true,
                customer: existing
            });
        }

        const { data, error } =
            await supabase
                .from("customers")
                .insert([
                    {
                        name: name.trim(),
                        phone: cleanPhone
                    }
                ])
                .select()
                .single();

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        res.json({
            success: true,
            customer: data
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   GET CUSTOMER
========================= */

app.get("/api/customer/:id", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("customers")
                .select("*")
                .eq("id", req.params.id)
                .single();

        if (error) {
            return res.status(404).json({
                error: "Customer not found"
            });
        }

        res.json({
            customer: data
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   DRIVER REGISTER
========================= */

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
                error: "All driver fields are required"
            });
        }

        const cleanPhone =
            String(phone).replace(/\D/g, "");

        const cleanVehicle =
            String(vehicle_number)
                .trim()
                .toUpperCase();

        if (cleanPhone.length < 10) {
            return res.status(400).json({
                error: "Invalid phone number"
            });
        }

        const { data: existingByPhone } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("phone", cleanPhone)
                .maybeSingle();

        if (existingByPhone) {

            const driver =
                await autoApproveDriver(
                    existingByPhone
                );

            return res.json({
                success: true,
                driver
            });
        }

        const { data: existingByVehicle } =
            await supabase
                .from("drivers")
                .select("*")
                .eq(
                    "vehicle_number",
                    cleanVehicle
                )
                .maybeSingle();

        if (existingByVehicle) {

            const driver =
                await autoApproveDriver(
                    existingByVehicle
                );

            return res.json({
                success: true,
                driver
            });
        }

        const { data, error } =
            await supabase
                .from("drivers")
                .insert([
                    {
                        name: name.trim(),
                        phone: cleanPhone,
                        vehicle_type,
                        vehicle_number: cleanVehicle,
                        rating: 5.0,
                        online: false,
                        status: "pending"
                    }
                ])
                .select()
                .single();

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        res.json({
            success: true,
            driver: data,
            message:
                "Driver registered. Approval will happen automatically after 2 minutes."
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   GET DRIVER
========================= */

app.get("/api/driver/:id", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", req.params.id)
                .single();

        if (error || !data) {
            return res.status(404).json({
                error: "Driver not found"
            });
        }

        const driver =
            await autoApproveDriver(data);

        res.json({
            driver
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   ALL DRIVERS
========================= */

app.get("/api/drivers", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("drivers")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        const drivers = [];

        for (const driver of data || []) {

            const updated =
                await autoApproveDriver(driver);

            drivers.push(updated);

        }

        res.json({
            drivers
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   DRIVER ONLINE / OFFLINE
========================= */

app.post("/api/driver/:id/status", async (req, res) => {

    try {

        const driverId = req.params.id;
        const { online } = req.body;

        const { data: oldDriver, error } =
            await supabase
                .from("drivers")
                .select("*")
                .eq("id", driverId)
                .single();

        if (error || !oldDriver) {
            return res.status(404).json({
                error: "Driver not found"
            });
        }

        const driver =
            await autoApproveDriver(
                oldDriver
            );

        if (
            online === true &&
            driver.status !== "approved"
        ) {
            return res.status(403).json({
                error: "Driver is still pending approval"
            });
        }

        const { data, error: updateError } =
            await supabase
                .from("drivers")
                .update({
                    online: Boolean(online)
                })
                .eq("id", driverId)
                .select()
                .single();

        if (updateError) {
            return res.status(500).json({
                error: updateError.message
            });
        }

        res.json({
            success: true,
            driver: data
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   DRIVER GPS LOCATION
========================= */

app.post("/api/driver/:id/location", async (req, res) => {

    try {

        const driverId = req.params.id;
        const { lat, lng } = req.body;

        if (
            typeof lat !== "number" ||
            typeof lng !== "number"
        ) {
            return res.status(400).json({
                error:
                    "Latitude and longitude required"
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

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

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
            driver: data
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   CREATE RIDE
========================= */

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
            !customer_id ||
            !pickup ||
            !drop_location ||
            !ride_type
        ) {
            return res.status(400).json({
                error: "Ride details missing"
            });
        }

        const { data, error } =
            await supabase
                .from("rides")
                .insert([
                    {
                        customer_id,
                        pickup,
                        drop_location,
                        ride_type,
                        distance_km:
                            distance_km || null,
                        fare:
                            fare || null,
                        pickup_lat:
                            pickup_lat || null,
                        pickup_lng:
                            pickup_lng || null,
                        drop_lat:
                            drop_lat || null,
                        drop_lng:
                            drop_lng || null,
                        status: "searching"
                    }
                ])
                .select()
                .single();

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        res.json({
            success: true,
            ride: data
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   GET RIDE
========================= */

app.get("/api/ride/:id", async (req, res) => {

    try {

        const { data: ride, error } =
            await supabase
                .from("rides")
                .select("*")
                .eq("id", req.params.id)
                .single();

        if (error || !ride) {
            return res.status(404).json({
                error: "Ride not found"
            });
        }

        let driver = null;

        if (ride.driver_id) {

            const { data: driverData } =
                await supabase
                    .from("drivers")
                    .select("*")
                    .eq("id", ride.driver_id)
                    .maybeSingle();

            if (driverData) {

                driver =
                    await autoApproveDriver(
                        driverData
                    );

            }

        }

        res.json({
            ride,
            driver
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   CUSTOMER RIDE HISTORY
========================= */

app.get(
    "/api/customer/:id/rides",
    async (req, res) => {

        try {

            const { data, error } =
                await supabase
                    .from("rides")
                    .select("*")
                    .eq(
                        "customer_id",
                        req.params.id
                    )
                    .order("created_at", {
                        ascending: false
                    });

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            res.json({
                rides: data || []
            });

        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


/* =========================
   DRIVER RIDE HISTORY
========================= */

app.get(
    "/api/driver/:id/history",
    async (req, res) => {

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

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            res.json({
                rides: data || []
            });

        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


/* =========================
   SEARCHING RIDES
========================= */

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
                error: error.message
            });
        }

        res.json({
            rides: data || []
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


/* =========================
   ACCEPT RIDE
========================= */

app.post(
    "/api/ride/:rideId/accept",
    async (req, res) => {

        try {

            const rideId =
                req.params.rideId;

            const { driver_id } =
                req.body;

            if (!driver_id) {
                return res.status(400).json({
                    error: "Driver ID required"
                });
            }

            const { data: driverData,
                    error: driverError } =
                await supabase
                    .from("drivers")
                    .select("*")
                    .eq("id", driver_id)
                    .single();

            if (
                driverError ||
                !driverData
            ) {
                return res.status(404).json({
                    error: "Driver not found"
                });
            }

            const driver =
                await autoApproveDriver(
                    driverData
                );

            if (driver.status !== "approved") {
                return res.status(403).json({
                    error: "Driver not approved"
                });
            }

            if (!driver.online) {
                return res.status(400).json({
                    error: "Driver is offline"
                });
            }

            const { data: ride,
                    error: rideError } =
                await supabase
                    .from("rides")
                    .select("*")
                    .eq("id", rideId)
                    .single();

            if (
                rideError ||
                !ride
            ) {
                return res.status(404).json({
                    error: "Ride not found"
                });
            }

            if (ride.status !== "searching") {
                return res.status(400).json({
                    error: "Ride already accepted"
                });
            }

            if (
                ride.ride_type.toLowerCase() !==
                driver.vehicle_type.toLowerCase()
            ) {
                return res.status(400).json({
                    error:
                        "Vehicle type does not match"
                });
            }

            const { data, error } =
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
                    .eq(
                        "status",
                        "searching"
                    )
                    .select()
                    .single();

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            res.json({
                success: true,
                ride: data
            });

        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


/* =========================
   REJECT
========================= */

app.post(
    "/api/ride/:rideId/reject",
    async (req, res) => {

        res.json({
            success: true,
            message: "Ride rejected"
        });

    }
);


/* =========================
   START RIDE
========================= */

app.post(
    "/api/ride/:rideId/start",
    async (req, res) => {

        try {

            const rideId =
                req.params.rideId;

            const { driver_id } =
                req.body;

            const { data, error } =
                await supabase
                    .from("rides")
                    .update({
                        status: "started",
                        started_at:
                            new Date()
                                .toISOString()
                    })
                    .eq("id", rideId)
                    .eq(
                        "driver_id",
                        driver_id
                    )
                    .eq(
                        "status",
                        "accepted"
                    )
                    .select()
                    .single();

            if (error) {
                return res.status(400).json({
                    error: error.message
                });
            }

            res.json({
                success: true,
                ride: data
            });

        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


/* =========================
   COMPLETE RIDE
========================= */

app.post(
    "/api/ride/:rideId/complete",
    async (req, res) => {

        try {

            const rideId =
                req.params.rideId;

            const { driver_id } =
                req.body;

            const { data, error } =
                await supabase
                    .from("rides")
                    .update({
                        status: "completed",
                        completed_at:
                            new Date()
                                .toISOString()
                    })
                    .eq("id", rideId)
                    .eq(
                        "driver_id",
                        driver_id
                    )
                    .eq(
                        "status",
                        "started"
                    )
                    .select()
                    .single();

            if (error) {
                return res.status(400).json({
                    error: error.message
                });
            }

            res.json({
                success: true,
                ride: data
            });

        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


/* =========================
   CANCEL RIDE
========================= */

app.post(
    "/api/ride/:rideId/cancel",
    async (req, res) => {

        try {

            const rideId =
                req.params.rideId;

            const { customer_id } =
                req.body;

            const { data, error } =
                await supabase
                    .from("rides")
                    .update({
                        status: "cancelled"
                    })
                    .eq(
                        "id",
                        rideId
                    )
                    .eq(
                        "customer_id",
                        customer_id
                    )
                    .in(
                        "status",
                        [
                            "searching",
                            "accepted"
                        ]
                    )
                    .select()
                    .single();

            if (error) {
                return res.status(400).json({
                    error: error.message
                });
            }

            res.json({
                success: true,
                ride: data
            });

        } catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


/* =========================
   RATING
========================= */

app.post(
    "/api/ride/:rideId/rating",
    async (req, res) => {

        try {

            const rideId =
                req.params.rideId;

            const {
                customer_id,
                rating,
                review
            } = req.body;

            const ratingNumber =
                Number(rating);

            if (
                !customer_id ||
                !ratingNumber ||
                ratingNumber < 1 ||
                ratingNumber > 5
            ) {
                return res.status(400).json({
                    error:
                        "Valid rating required"
                });
            }

            const { data: ride,
                    error: rideError } =
                await supabase
                    .from("rides")
                    .select("*")
                    .eq(
                        "id",
                        rideId
                    )
                    .eq(
                        "customer_id",
                        customer_id
                    )
                    .single();

            if (
                rideError ||
                !ride
            ) {
                return res.status(404).json({
                    error: "Ride not found"
                });
            }

            const { data, error } =
                await supabase
                    .from("rides")
                    .update({
                        rating:
                            ratingNumber,
                        review:
                            review || null
                    })
                    .eq(
                        "id",
                        rideId
                    )
                    .select()
                    .single();

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            if (ride.driver_id) {

                const { data: ratings } =
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
                    ratings &&
                    ratings.length
                ) {

                    const total =
                        ratings.reduce(
                            (sum, item) =>
                                sum +
                                Number(
                                    item.rating
                                ),
                            0
                        );

                    const average =
                        total /
                        ratings.length;

                    await supabase
                        .from("drivers")
                        .update({
                            rating:
                                Number(
                                    average
                                        .toFixed(1)
                                )
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

            res.status(500).json({
                error: error.message
            });

        }

    }
);


/* =========================
   SERVER
========================= */

const PORT =
    process.env.PORT || 10000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `RideMini server running on port ${PORT}`
        );
    }
);
