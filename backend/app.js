const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt')
const mongodb = require('mongodb');
const jwt = require('jsonwebtoken');
require("dotenv").config();
//var randomStr = require("randomstring");


const port = process.env.port || 3000;
const atlasUrl = `mongodb+srv://${process.env.mongoUser}:${process.env.mongoPass}@cluster0.xiulw.mongodb.net/${process.env.dbname}?retryWrites=true&w=majority`;

//configuring
const app = express();

//middleware
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.json({ msg: 'welcome' })
})

//Api which displays all end users
app.get('/users', async (req, res) => {
    let connection;
    try {
        connection = await mongodb.connect(atlasUrl, { useUnifiedTopology: true });
        let db = connection.db(process.env.dbname);
        let userDta = await db.collection('endUsers').find().toArray();
        res.json(userDta);
        connection.close();
    }
    catch (err) {
        if (connection) {
            await connection.close();
            console.log(err);
            res.status(500).json(err);
        }
    }
})

//Login 
app.post('/login', async (req, res) => {
    let connection;
    let { email, password, userType } = req.body;
    console.log(email, password, userType);
    try {
        connection = await mongodb.connect(atlasUrl);
        let db = connection.db(process.env.dbname);
        let userDetails = await db.collection(`${userType}s`).findOne({ email });
        if (!userDetails) {
            res.status(403).json({ message: 'Invalid email or userType.' })
        }
        else {
            let isValid = await bcrypt.compare(password, userDetails.password);
            if (isValid) {
                res.status(200).json({
                    status: 200,
                    message: "login success",
                });
            }
            else {
                res.status(403).json({ message: 'Invalid password' });
            }
        }

    }
    catch (err) {
        if (connection) {
            console.log(err);
            res.status(500).json(err);
        }
    }
})

// Adds new user
app.post('/register', async (req, res) => {
    let connection;
    try {
        connection = await mongodb.connect(atlasUrl);
        let db = connection.db(process.env.dbname);
        const endUsersCount = await db.collection("endUsers").estimatedDocumentCount();
        req.body.userId = endUsersCount + 1;
        req.body.managerAssigned = 'manager' + (endUsersCount + 1) % 4
        req.body.loanStatus = 'REQUESTED';
        let userData = await db.collection('endUsers').findOne({ email: req.body.email });
        if (userData) {
            res.status(400).json({ message: 'user already exists' });
        }
        else {
            let salt = await bcrypt.genSalt(10);
            let hash = await bcrypt.hash(req.body.password, salt);
            req.body.password = hash;
            userData = await db.collection('endUsers').insertOne(req.body);

            let newValue = {
                $push: { usersAssigned: +req.body.userId }
            };
            await db.collection('customerManagers').update({ name: req.body.managerAssigned },
                newValue);
            res.status(200).json({ message: 'user registered successfully' });
            await connection.close();
        }
    }

    catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
})

// Api which gets end user data based on id
app.get('/endusers/:id', async (req, res) => {

    let connection;
    try {
        connection = await mongodb.connect(atlasUrl);
        let db = connection.db(process.env.dbname);
        let reqUsers = await db.collection('endUsers').findOne({ userId: +req.params.id });
        await connection.close();
        if (reqUsers) {
            res.json(
                {
                    'All User Details': reqUsers,
                    'LoanStatus': reqUsers.loanStatus,
                }
            );
        }
        else {
            res.write('User with this id does not exist');
        }
    }
    catch (err) {
        if (connection) {
            await connection.close();
            console.log(err);
            res.status(500).json(err);
        }
    }

});

// Api which gets loan requests list of endUsers assigned to him
app.get('/customerManager/:name', async (req, res) => {

    let connection;
    try {
        connection = await mongodb.connect(atlasUrl);
        let db = connection.db(process.env.dbname);
        let usersList = await db.collection('endUsers').find().toArray();
        await connection.close();
        let newArr = [];
        usersList.map((user) => {
            if (user.managerAssigned === req.params.name) {
                newArr.push({
                    userId: user.userId,
                    name: user.name,
                    assignedManager: user.managerAssigned,
                    loanStatus: user.loanStatus,
                })
            }
        })
        console.log(newArr);
        if (newArr.length) {
            res.json({ 'Users List': newArr });
        }
        else {
            res.send('only 4 managers are hired: manager1 , manager2 ,manager3 ,manager4');
        }
    }
    catch (err) {
        if (connection) {
            await connection.close();
            console.log(err);
            res.status(500).json(err);
        }
    }

});

//Api which when bank manager logs in and updates user loan status
app.get('/bankManager', async (req, res) => {

    let connection;
    try {
        connection = await mongodb.connect(atlasUrl);
        let db = connection.db(process.env.dbname);
        let usersList = await db.collection('endUsers').find().toArray();

        let newArr = [];
        let updatedArr = [];
        usersList.map(async (user) => {
            newArr.push({
                userId: user.userId,
                name: user.name,
                assignedManager: user.managerAssigned,
                loanStatus: user.loanStatus,
                userStatus: user.userStatus,
                loanAmount: user.loanAmount,
            })
            if (user.userStatus === 'Rich' || user.userStatus === 'MiddleClass') {
                let users = await db.collection('endUsers').findOneAndUpdate({ userId: user.userId }, { $set: { loanStatus: "Approved" } })
                console.log('user....', users);
            }
            else if (user.userStatus === 'Poor') {
                if (user.loanAmount === '10L' || user.loanAmount === '20L' || user.loanAmount === '30L') {
                    await db.collection('endUsers').findOneAndUpdate({ "userId": user.userId }, { $set: { loanStatus: "Approved" } })

                }
                else {
                    await db.collection('endUsers').findOneAndUpdate({ "userId": user.userId }, { $set: { loanStatus: "Not Approved" } })

                }

            }
        })

        let newusersList = await db.collection('endUsers').find().toArray();
        newusersList.map((user) => {
            updatedArr.push({
                userId: user.userId,
                name: user.name,
                assignedManager: user.managerAssigned,
                loanStatus: user.loanStatus,
                userStatus: user.userStatus,
                loanAmount: user.loanAmount,
            })
        })

        await connection.close();
        if (newArr.length) {
            res.json({
                'Users List': newArr,
                'After updating loan status': updatedArr
            });
        }
        else {
            res.send('only 4 managers are hired: manager1 , manager2 ,manager3 ,manager4');
        }
    }
    catch (err) {
        if (connection) {
            await connection.close();
            console.log(err);
            res.status(500).json(err);
        }
    }
})



// Listens to port 3000
app.listen(3000, () => {
    console.log('Listening to port 3000');
})