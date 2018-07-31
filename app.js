'use strict';

// require modules
const result = require('dotenv').config()
const express = require('express');
const jsonParser = require('body-parser').json;
const logger = require('morgan');
const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcrypt');
const fs = require('fs');
const RateLimit = require('express-rate-limit');

// initialize limiter
const limiter = new RateLimit({
    windowMs: 15*60*1000, // 15 minutes to reset
    max: 100, // 100 requests
    delayMs: 0 // disable respose delay
});

// initialize app
const app = express();
app.use(logger('dev'));
app.use(jsonParser());
app.use(limiter); // use limiter as middleware


// initialize mongoose connection
mongoose.connect(process.env.MONGOOSE_DB, { useNewUrlParser: true });
const db = mongoose.connection;

db.on('error', err => {
    console.error('connection error:', err);
});

db.once('open', () => {
    console.log('db connection successful');
})

// Basic auth
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    const authToken = authHeader.split(' ');
    if(authToken[0].toLowerCase() === 'basic') {
        const authValues = Buffer.from(authToken[1], 'base64').toString().split(':');
        const auth = {
            username: authValues[0],
            password: authValues[1]
        }
        User.findOne({username: auth.username})
        .then(user => {
            if (!user) {
                let err = new Error('Invalid credentials');
                err.status = 401;
                return next(err);
            } else {
                bcrypt.compare(auth.password, user.password)
                .then(result => {
                    if(!result) {
                        const err = new Error('Invalid credentials');
                        err.status = 401;
                        next(err);
                    } else {
                        req.user_name = user.username;
                        next();
                    }
                })
                .catch(err => next(err));
            }
        })
        .catch(err => next(err));
    }
});


//
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	if(req.method === "OPTIONS") {
		res.header("Access-Control-Allow-Methods", "PUT,POST,DELETE");
		return res.status(200).json({});
	}
	next();
});


// Routes
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders')
app.use('/users', userRoutes);
app.use('/orders', orderRoutes);

// Error handling middleware
// 404
function create404(req) {
    const err = new Error(`${req.method} ${req.originalUrl} not supported`);
    err.status = 404;
    return err;
}

app.use((req, res, next) => {
    next(create404(req));
});

app.use((err, req, res, next) => {
    res.status(err.status || 500); // undefined when internal server error, hence 500
    res.json({
        error: {
            message: err.message
        }
    })
});

module.exports.create404 = create404;

// application listener;
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Express app running on port:${port}`)
});
