const express = require('express');
const router = express.Router();
const sha1 = require('sha1');
const fs = require('fs').promises;

module.exports = (pool, mongoClient, s3, multipart, uploadPath) => {

const { mkQuery } = require('../db_utils');
// SQL statements
const SQL_GET_USER = "select * from user where user_id = ?";
const getUser = mkQuery(SQL_GET_USER, pool);

// Configure resources

// POST /login
router.post('/login', express.json(), async (req, res) => {
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
router.post('/upload', multipart.single('document'),  async (req, res) => {

    const { title, comments, user_id, password } = req.body;
    const hashedPassword = sha1(`${password}`);

    try{

		// Check if user is authenticated
        const hashStoredInDB = await getUser([user_id]);

        if( Object.keys(hashStoredInDB).length < 1 ) {
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
        const [s3Resp, mongoResp] = await Promise.all([p0, p1]);
    
        // Remove file after process ends
        await fs.rmdir(uploadPath, {recursive: true});
        await fs.mkdir(uploadPath);

        res.status(200).type('application/json').json({success: true, key: req.file.filename, _id: mongoResp.ops[0]._id});

    } catch (e) {
		if(e.message == 'User not found' || 'Invalid Password') {
			console.error(e);
			return res.status(401).type('application/json').json({success: false, error: e.message});
		}
        console.error(e);
        res.status(500).type('application/json').json({success: false, error: e.message});
    }
});

return router;
}