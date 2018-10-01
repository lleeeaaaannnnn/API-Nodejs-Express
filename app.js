'use strict';

// require modules
const result = require('dotenv').config({path: './private/.env'})
const express = require('express');
const jsonParser = require('body-parser').json;
const logger = require('morgan');
const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcrypt');
const fs = require('fs');
const RateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// initialize limiter
const limiter = new RateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW), // milliseconds to reset
    max: parseInt(process.env.RATE_LIMIT_MAX), // max requests before limiter triggers
    delayMs: 0 // disable respose delay
});

// initialize app
const app = express();
app.use(logger('dev'));
app.use(jsonParser());
app.use(limiter); // use limiter as middleware


// initialize mongoose connection
mongoose.connect(process.env.MONGOOSE_DB, { useNewUrlParser: true })
    .then(result => {})
    .catch(err => console.log(err.message));
    
const db = mongoose.connection
db.on('error', err => {
  console.error('connection error:', err);
});

db.once('open', () => {
  console.log('db connection successful');
})


const authenticateUser = function (searchOptions, password, cb) {
    User.findOne(searchOptions)
    .then(user => {
        if (!user) {
            let err = new Error('Invalid credentials');
            err.status = 401;
            cb(err, err);
        } else {
            bcrypt.compare(password, user.password)
            .then(result => {
                if(!result) {
                    const err = new Error('Invalid credentials');
                    err.status = 401;
                    cb(null, err);
                } else {
                    cb(user);
                }
            })
            .catch(err => cb(null, err));
        }
    })
    .catch(err => cb(null, err));    
}


// Auth middleware
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        const err = new Error('Authorization required');
        err.status = 401;
        return next(err);
    }
    const authToken = authHeader.split(' ');
    if(authToken[0].toLowerCase() === 'basic') {
        const authValues = Buffer.from(authToken[1], 'base64').toString().split(':');
        const auth = {
            username: authValues[0],
            password: authValues[1]
        }
        authenticateUser({username: auth.username}, auth.password, (user, err) => {
            if(err) next(err);
            req.user = user;
            req.user_name = user.username;
            next();
        })
    } else if (authToken[0].toLowerCase() === 'bearer') {
        jwt.verify(authToken[1], process.env.JWT_SECRET, (err, decoded) => {
            if(err) {
                next(err);
            } else {
                console.log(decoded);
                User.findOne({username: decoded.id})
                .then(user => {
                    req.user = user;
                    next();
                })
                .catch(err => next(err));
            }
        })
    } else {
        const err = new Error(`${authToken[0]} not supported`)
        err.status = 401;
        next(err);
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


// Check users for 3rd party apps
app.post('/authenticate_user', (req, res, next) => {
    if(!req.body.email || !req.body.password) {
        const err = new Error('Email and password required');
        err.status = 404;
        next(err);
    } else {
        authenticateUser({email: req.body.email}, req.body.password, (user, err) => {
            if(err) { 
                return next(err);
            }
            req.user = user;
            req.user_name = user.username;            
            res.json(user);
        })
    }
})


app.get('/getAuthToken', (req, res, next) => {
    if(req.user) {
        res.json({token: req.user.getAuthToken()});
    } else {
        const err = new Error('You are not authorized');
        err.status = 401;
        next(err);
    }
})

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
        status: 'error',
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
