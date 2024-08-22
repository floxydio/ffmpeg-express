const express = require("express");
const app = express();
const port = 2500;
const path = require("path");
const { spawn } = require("child_process");
const bodyParser = require("body-parser");
const db = require("./database/db_init");
const schedule = require("node-schedule");

const baseOutputDir = path.join(__dirname, "output");
const activeStreams = {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/video", express.static(baseOutputDir));

console.log("output -->", baseOutputDir)

function clearAllFolderInsideOutputDirectory() {
    const fs = require("fs");
    const directory = baseOutputDir;

    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

// Schedule job to delete output every 6 days
schedule.scheduleJob('0 0 */6 * *', () => {
    clearAllFolderInsideOutputDirectory();
    console.log('Scheduled task executed: cleared output directory.');
});

function stringGeneratorOnlyText() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
let streamM3 = stringGeneratorOnlyText();

function startFFMpegStream(inputURL, streamName) {
    const scriptPath = path.join(__dirname, "exec.sh");
    const ffmpeg = spawn("sh", [scriptPath, inputURL, baseOutputDir, streamName, streamM3])

    ffmpeg.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on("data", (data) => {
        console.log(`stderr: ${data}`);
    });

    ffmpeg.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
        delete activeStreams[streamName];
    });

    return ffmpeg;
}

app.get("/stream", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM streams");
        res.json(rows);
    } catch (e) {
        console.log(e.message);
        res.status(500).json({ message: "Error fetching streams" });
    }
});

app.post("/stream", async (req, res) => {
    const { inputURL, streamName } = req.body;

    if (!inputURL || !streamName) {
        return res.status(400).json({ message: "Input URL and Stream Name are required" });
    }

    try {
        const ffmpeg = startFFMpegStream(inputURL, streamName);
        activeStreams[streamName] = ffmpeg;

        if (!ffmpeg) {
            return res.status(500).json({ message: "Error starting stream" });
        }

        const [result] = await db.execute(
            "INSERT INTO streams (stream_name, input_url, output_url, start_time) VALUES (?, ?, ?, ?)",
            [
                streamName,
                inputURL,
                `${baseOutputDir}/${streamM3}.m3u8`,
                new Date(),
            ]
        );

        res.json({ message: `Streaming started for ${streamName}`, result });
    } catch (e) {
        console.log(e.message);
        res.status(500).json({ message: "Error starting stream" });
    }
});

app.post("/stop-stream", (req, res) => {
    const { streamName } = req.body;

    if (!streamName) {
        return res.status(400).json({ message: "Stream name is required" });
    }

    const ffmpegProcess = activeStreams[streamName];

    if (ffmpegProcess) {
        console.log(`Stopping stream: ${streamName}`);

        // Use taskkill to stop the process in Windows
        spawn('taskkill', ['/PID', ffmpegProcess.pid, '/F']);

        // Remove the process from activeStreams
        delete activeStreams[streamName];

        res.json({ message: `Stream ${streamName} stopped successfully` });
    } else {
        res.status(404).json({ message: "Stream not found" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
