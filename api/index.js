let express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
let { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID, SECRET_KEY } = process.env;
PGPASSWORD = decodeURIComponent(PGPASSWORD);

let app = express();
app.use(cors({
    origin: '<a href="https://3-a-1-backend-beginner-5nktqb5aw-jumper9222s-projects.vercel.app">https://3-a-1-backend-beginner-5nktqb5aw-jumper9222s-projects.vercel.app&#39</a>;',
    credentials: true
}));
app.use(express.json());

const pool = new Pool({
    host: PGHOST,
    database: PGDATABASE,
    username: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function getPostgresVersion() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT version()");
        console.log(res.rows[0]);
    } finally {
        client.release();
    }
}

getPostgresVersion();

app.get('/', (req, res) => {
    res.send("Auth app API");
})

app.post("/signup", async (req, res) => {
    const client = await pool.connect();

    try {

        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);

        const userResult = await client.query(
            "SELECT * FROM blog_users WHERE username = $1",
            [username]
        );

        if (userResult.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        };

        await client.query(
            "INSERT INTO blog_users (username, password) VALUES ($1, $2)",
            [username, hashedPassword]
        );
        res.status(201).json({ message: "User registered successfully" })
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.post("/login", async (req, res) => {
    const client = await pool.connect();
    try {
        const { username, password } = req.body;

        const result = await client.query(
            "SELECT * FROM blog_users WHERE username = $1",
            [username]
        )
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ message: "Username or password incorrect" });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).json({ auth: false, token: null });
        }

        var token = jwt.sign({
            id: user.id,
            username: user.username,
        },
            SECRET_KEY, {
            expiresIn: 86400,
        });
        res.status(200).json({ auth: true, token: token })
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.listen(3001, () => {
    console.log("Server is running on port 3001");
})
