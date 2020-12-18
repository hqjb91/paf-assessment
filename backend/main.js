const morgan = require('morgan')
const express = require('express')
const multer = require('multer');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const AWS = require('aws-sdk');
AWS.config.credentials = new AWS.SharedIniFileCredentials('default');
require('dotenv').config();
const routes = require('./routes/route');
const path = require('path');
const uploadPath = path.join(__dirname, 'uploads');

const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;

// Configure mysql pool
const pool = mysql.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    timezone: '+08:00',
    port: 3306,
    connectionLimit: 5
});

// Configure mongoclient
const mongoClient = new MongoClient(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Configure AWS
const endpoint = new AWS.Endpoint(process.env.AWS_ENDPOINT);
const s3 = new AWS.S3({
    endpoint,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

// Configure multer
const multipart = multer({ dest: uploadPath });

const app = express();

app.use(morgan('combined'));
app.use(express.static(path.join(__dirname, 'frontend')));

// Use router
app.use('/', routes(pool, mongoClient, s3, multipart, uploadPath));

// Test DB connections and start the server
const p0 = (async ()=> {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release()
    return true;
})();

const p1 = mongoClient.connect();

const p2 = new Promise( (resolve, reject) => {
    if(!!process.env.AWS_ACCESS_KEY && !!process.env.AWS_SECRET_KEY){
        resolve();
    } else {
        reject();
    }
});

Promise.all([p0, p1, p2]).then( () => {

	app.listen(PORT, () => {
		console.info(`Application started on port ${PORT} at ${new Date()}`);
	})
})
.catch( err => {
    console.error(err);
})