// All Require;
const express = require('express');
const mongoDB = require('mongodb');
const MongoClient = mongoDB.MongoClient;
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const API = express();
require("dotenv").config();
const URL =process.env.LINK;
const DB =process.env.DB;
var nodemailer = require('nodemailer');
const FROM = process.env.FROM;
const PASSWORD = process.env.PASSWORD

//Middleware;
API.use(express.json());
API.use(cors({ origin: "https://gold-rate-calculator-1.netlify.app"}))

//Conform to Working API;
API.get("/", function (req, res) {
    res.send('<h1>Make a Way..</h1>')
});

//New User registration;
API.post("/Register", async function (req, res) {
    try {
        let connection = await MongoClient.connect(URL);
        let db = connection.db(DB);
        let salt = await bcrypt.genSalt(10);
        let hash = await bcrypt.hash(req.body.Password, salt)
        req.body.Password = hash
        await db.collection("Users").insertOne(req.body);
        res.status(200).json({ Message: 'New user Add Successfully' });
        
    } catch (error) {
        res.status(500).json({ Message: 'Something Went Wrong' })
        console.log(error);
    }

})


//Login && Login Verification;
API.post("/Login", async function (req, res) {
    try {
        let connection = await MongoClient.connect(URL);
        let db = connection.db(DB);

        //User Verification;
        let user = await db.collection("Users").findOne({ Email: req.body.Email });
        let Name = user.Username
        if (user) {
            if (user) {
                let compare = await bcrypt.compare(req.body.Password, user.Password);
                console.log(compare);
                if (compare) {
                    let token = jwt.sign({ _id: user._id }, process.env.SEC, { expiresIn: '5m' });
                    res.json({token,Name});
                } else {
                    res.json({ Message: 'Email or Password Wrong' });
                }
            }
        } else {
            res.json({ Message: 'Email or Password Wrong' })
        }
        
    } catch (error) {
        res.status(500).json({ Message: 'Something Went Wrong' });
        console.log(error);
    }
    
})


//Forget Password;
//Mail get and Checking;
API.post("/Reset", async function (req, res) {
    try {
        let connection = await MongoClient.connect(URL);
        let db = connection.db(DB);

        let id = await db.collection("Users").findOne({ Email: req.body.Email });
        let Email = req.body.Email
        if (!id) {
            res.status(404).json({ message: "User Not Exists" });
        }
        let token = jwt.sign({ _id: id._id }, process.env.SEC, { expiresIn: '5m' });

        const link = `https://gold-rate-calculator-1.netlify.app/Update/${id._id}/${token}`;
        console.log(link);
        
        //Send a link Via mail;
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user:FROM,
                pass:PASSWORD
            }
        });

        var mailOptions = {
            from:FROM,
            to: Email,
            subject: 'Password Reset',
            text:"Click this Link Reset Your Password",
            html:`<Link to=${link} target="_blank">${link}</Link>`,
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent:' + info.response);
            }
        });
        res.send(link);

    } catch (error) {
        res.status(500).json({ Message: 'Something Went Wrong' });
        console.log(error);
    }
})



//Update New Password;
API.post("/Update/:id/:token", async function (req, res) {
    const id = req.params.id
    const token = req.params.token
    try {

        let salt = await bcrypt.genSalt(10);
        let hash = await bcrypt.hash(req.body.Password, salt);
        let connection = await MongoClient.connect(URL);
        let db = connection.db(DB);

        let compare = jwt.verify(token,process.env.SEC);
        console.log(compare);
        if (compare) {
            let Person = await db.collection("Users").findOne({ _id: mongoDB.ObjectId(`${id}`) })
            if (!Person) {
                return res.json({ Message: "User Exists!!" });
            }
            await db.collection("Users").updateOne({ _id: mongoDB.ObjectId(`${id}`) }, { $set: { Password: hash } });
            res.json({ Message: "Password Updated" });
        } 
        else {
            res.json({ Message: "URL TimeOut" })
        }
    } catch (error) {
        res.status(500).json({ Message: 'URL TimeOut' });
        console.log(error);
    }

})


//Get All data of city,and GOld rate's
API.get('/All_Data',async function(req,res){
    try {
        let connection = await MongoClient.connect(URL);
        let db = connection.db(DB);
        let data = await db.collection("Gold").find().toArray()
        await connection.close()
        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({Message:"Something Went wrong"})
        console.log(error);
    }
})

//Rate card Data
API.get('/Rate_card',async function(req,res){
    try {
        let connection = await MongoClient.connect(URL);
        let db = connection.db(DB);
        let data = await db.collection("Today").find().toArray()
        await connection.close()
        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({Message:"Something Went wrong"})
        console.log(error);
    }
})

//PORT Listen;
API.listen(process.env.PORT || 7000);