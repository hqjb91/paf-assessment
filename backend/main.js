const morgan = require('morgan')
const express = require('express')
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const AWS = require('aws-sdk');
const sha1 = require('sha1');
AWS.config.credentials = new AWS.SharedIniFileCredentials('default');
require('dotenv').config();

const { mkQuery } = require('./db_utils');

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
const multipart = multer({ dest: path.join(__dirname, 'uploads')});

// SQL statements
const SQL_GET_USER = "select * from user where user_id = ?";
const getUser = mkQuery(SQL_GET_USER, pool);

const app = express();

app.use(morgan('combined'));


// Configure resources

// POST /login
app.post('/login', express.json(), async (req, res) => {
    const { user_id, password } = req.body;
    const hashedPassword = sha1(`${password}`);

    try {
		const hashStoredInDB = await getUser([user_id]);

        if( !hashStoredInDB ) {
            throw new Error('User not found');
        }
        if( hashedPassword != hashStoredInDB.password ) {
            throw new Error('Invalid Password');
		}

        res.status(200).json({success: true});
    } catch (e) {
        console.error(e);
        res.status(401).json({success: false, error: e.message});
    } 
});

// POST /upload
app.post('/upload', multipart.single('document'),  async (req, res) => {

    const { title, comments, user_id, password } = req.body;
    const hashedPassword = sha1(`${password}`);

    // Remove file after process ends
    process.on('end', () => {
		fs.rmdir(path.join(__dirname, 'uploads'), { recursive: true })
            .then(() => console.log('Uploads directory removed.'));
	});

    try{

		// Check if user is authenticated
		const hashStoredInDB = await getUser([user_id]);

        if( !hashStoredInDB ) {
            throw new Error('User not found');
        }
        if( hashedPassword != hashStoredInDB.password ) {
            throw new Error('Invalid Password');
		}
		
		// Read file obtained from multer
        const fsResponse = await fs.readFile(req.file.path);

        // Configure AWS params
        const PARAMS = {
            Bucket: process.env.AWS_BUCKET,
            Key: req.file.filename,
            ContentType: req.file.mimetype,
            ContentLength: req.file.size,
            Body: fsResponse,
            ACL: 'public-read',
            Metadata: {
                originalName: req.file.originalname
            }
		}
		
        const currDate = new Date();
        
        // Store posts in mongodb and image in S3

        const p0 = s3.putObject(PARAMS).promise();
        const p1 = mongoClient.db('paf2020').collection('posts')
            .insertOne({
                title, comments, picture: `${req.file.filename}`, timestamp: currDate
            });
        Promise.all([p0, p1]).then( ([res1, res2]) => {} ).catch( e => { throw e });
    
        res.status(201).type('application/json').json({success: true, key: req.file.filename});
    } catch (e) {
		if(e.message = 'User not found' || 'Invalid Password') {
			console.error(e);
			return res.status(401).type('application/json').json({success: false, error: e.message});
		}
        console.error(e);
        res.status(500).type('application/json').json({success: false, error: e.message});
    }
});



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