const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;


// ============================================================
// EXPRESS
// ============================================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ============================================================
// ASV TELEMETRY STATE
// ============================================================

let asvData = {

    connection: {
        connected: true
    },


    gps: {

        fix: true,

        latitude: -6.123456,

        longitude: 107.123456,

        satellites: 12,

        hdop: 0.8,

        altitude: 15.2,

        // Speed Over Ground
        sog: 2.45,

        // Course Over Ground
        cog: 126.0

    },


    navigation: {

        // Magnetic heading
        heading: 125.0,

        reference: "MAG"

    },


    imu: {

        roll: 2.1,

        pitch: -1.3,

        yaw: 125.4,

        gyroX: 0.02,

        gyroY: -0.01,

        gyroZ: 0.04

    },


    power: {

        voltage: 15.2,

        current: 3.6,

        power: 54.72,

        batteryPercent: 78,

        remainingAh: 23.4,

        fullCapacity: 30.0,

        temperature: 32.4

    },


    mission: {

        status: "IDLE",

        mode: "MANUAL",

        currentWaypoint: null,

        nextWaypoint: "WP1",

        progress: 0

    },


    system: {

        uptime: 0

    }

};


// ============================================================
// WAYPOINTS
// ============================================================

let waypoints = [

    {
        id: "HOME",

        type: "home",

        name: "HOME",

        latitude: -6.123000,

        longitude: 107.122000

    },

    {
        id: "WP1",

        type: "waypoint",

        name: "WP1",

        latitude: -6.123456,

        longitude: 107.123456

    },

    {
        id: "WP2",

        type: "waypoint",

        name: "WP2",

        latitude: -6.123987,

        longitude: 107.124987

    },

    {
        id: "WP3",

        type: "waypoint",

        name: "WP3",

        latitude: -6.124567,

        longitude: 107.125679

    },

    {
        id: "DOCK",

        type: "dock",

        name: "DOCK",

        latitude: -6.125000,

        longitude: 107.126000

    }

];


// ============================================================
// SOCKET
// ============================================================

io.on(
    "connection",
    socket => {

        console.log(
            "Client connected:",
            socket.id
        );


        socket.emit(
            "telemetry",
            asvData
        );


        socket.emit(
            "waypoints",
            waypoints
        );


        // ====================================================
        // START MISSION
        // ====================================================

        socket.on(
            "startMission",
            () => {

                const missionWaypoints =
                    waypoints.filter(
                        wp =>
                            wp.type === "waypoint"
                    );


                if (
                    missionWaypoints.length === 0
                ) {

                    socket.emit(
                        "systemMessage",
                        {
                            type: "error",
                            message:
                                "Tidak ada waypoint."
                        }
                    );

                    return;

                }


                asvData.mission.status =
                    "RUNNING";


                asvData.mission.mode =
                    "AUTO";


                asvData.mission.currentWaypoint =
                    missionWaypoints[0].name;


                asvData.mission.nextWaypoint =
                    missionWaypoints[0].name;


                asvData.mission.progress =
                    0;


                io.emit(
                    "telemetry",
                    asvData
                );

            }
        );


        // ====================================================
        // PAUSE
        // ====================================================

        socket.on(
            "pauseMission",
            () => {

                if (
                    asvData.mission.status ===
                    "RUNNING"
                ) {

                    asvData.mission.status =
                        "PAUSED";


                    io.emit(
                        "telemetry",
                        asvData
                    );

                }

            }
        );


        // ====================================================
        // STOP
        // ====================================================

        socket.on(
            "stopMission",
            () => {

                asvData.mission.status =
                    "IDLE";


                asvData.mission.mode =
                    "MANUAL";


                asvData.mission.currentWaypoint =
                    null;


                asvData.mission.nextWaypoint =
                    "WP1";


                asvData.mission.progress =
                    0;


                io.emit(
                    "telemetry",
                    asvData
                );

            }
        );


        // ====================================================
        // FAILSAFE TEST
        // ====================================================

        socket.on(
            "failsafeTest",
            () => {

                asvData.mission.status =
                    "FAILSAFE";


                asvData.mission.mode =
                    "FAILSAFE";


                io.emit(
                    "telemetry",
                    asvData
                );


                io.emit(
                    "systemMessage",
                    {
                        type: "warning",
                        message:
                            "FAILSAFE ACTIVE — RETURN TO HOME"
                    }
                );

            }
        );


        // ====================================================
        // ADD WAYPOINT
        // ====================================================

        socket.on(
            "addWaypoint",
            data => {

                const count =
                    waypoints.filter(
                        wp =>
                            wp.type ===
                            "waypoint"
                    ).length;


                const waypoint = {

                    id:
                        `WP${count + 1}`,

                    type:
                        "waypoint",

                    name:
                        `WP${count + 1}`,

                    latitude:
                        Number(
                            data.latitude
                        ),

                    longitude:
                        Number(
                            data.longitude
                        )

                };


                waypoints.push(
                    waypoint
                );


                io.emit(
                    "waypoints",
                    waypoints
                );

            }
        );


        // ====================================================
        // DELETE WAYPOINT
        // ====================================================

        socket.on(
            "deleteWaypoint",
            id => {

                if (
                    id === "HOME" ||
                    id === "DOCK"
                ) {
                    return;
                }


                waypoints =
                    waypoints.filter(
                        wp =>
                            wp.id !== id
                    );


                io.emit(
                    "waypoints",
                    waypoints
                );

            }
        );


        // ====================================================
        // CLEAR MISSION
        // ====================================================

        socket.on(
            "clearMission",
            () => {

                waypoints =
                    waypoints.filter(
                        wp =>
                            wp.type === "home" ||
                            wp.type === "dock"
                    );


                io.emit(
                    "waypoints",
                    waypoints
                );

            }
        );


        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Client disconnected:",
                    socket.id
                );

            }
        );

    }
);


// ============================================================
// TELEMETRY SIMULATOR
//
// NANTI BAGIAN INI DIGANTI DENGAN DATA ESP32.
// ============================================================

setInterval(
    () => {


        // ====================================================
        // HEADING
        // ====================================================

        asvData.navigation.heading +=
            (
                Math.random() -
                0.5
            ) * 1.2;


        asvData.navigation.heading =
            normalizeAngle(
                asvData.navigation.heading
            );


        // ====================================================
        // COG
        // ====================================================

        asvData.gps.cog +=
            (
                Math.random() -
                0.5
            ) * 1.0;


        asvData.gps.cog =
            normalizeAngle(
                asvData.gps.cog
            );


        // ====================================================
        // SOG
        // ====================================================

        asvData.gps.sog =
            2.25 +
            Math.random() * 0.45;


        // ====================================================
        // IMU
        // ====================================================

        asvData.imu.roll =
            2.0 +
            (
                Math.random() -
                0.5
            ) * 1.2;


        asvData.imu.pitch =
            -1.2 +
            (
                Math.random() -
                0.5
            ) * 0.8;


        asvData.imu.yaw =
            asvData.navigation.heading +
            (
                Math.random() -
                0.5
            ) * 0.8;


        // ====================================================
        // POWER
        // ====================================================

        asvData.power.current =
            3.0 +
            Math.random() * 1.2;


        asvData.power.voltage =
            14.9 +
            Math.random() * 0.5;


        asvData.power.power =
            asvData.power.voltage *
            asvData.power.current;


        // ====================================================
        // MISSION
        // ====================================================

        if (
            asvData.mission.status ===
            "RUNNING"
        ) {

            asvData.gps.latitude +=
                0.000004;


            asvData.gps.longitude +=
                0.000004;


            asvData.mission.progress +=
                0.35;


            if (
                asvData.mission.progress >=
                100
            ) {

                asvData.mission.progress =
                    100;


                asvData.mission.status =
                    "COMPLETED";

            }

        }


        // ====================================================
        // UPTIME
        // ====================================================

        asvData.system.uptime++;


        // ====================================================
        // SEND
        // ====================================================

        io.emit(
            "telemetry",
            asvData
        );

    },
    1000
);


// ============================================================
// HELPER
// ============================================================

function normalizeAngle(
    angle
) {

    angle =
        Number(angle) || 0;


    angle =
        angle % 360;


    if (
        angle < 0
    ) {

        angle += 360;

    }


    return angle;

}


// ============================================================
// SERVER
// ============================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "======================================"
        );

        console.log(
            "       ASV CONTROL SYSTEM"
        );

        console.log(
            "======================================"
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "======================================"
        );

    }
);