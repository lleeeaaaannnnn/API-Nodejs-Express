'use strict';

const express = require('express');
const router = express.Router();

// file imports
const User = require('../models/user')
const Order = require('../models/order')


router.param('uID', (req, res, next, userID) => {
    User.findById(userID)
        .then(user => {
            if(user) {
                req.user = user;
                return next();
            }  else {
                const err = new Error('User not found');
                err.status = 404;
                return next(err);
            } 
        }).catch(err => next(err));
});

router.get('/', (req, res, next) => {
    User.find().select('-password')
        .then(users => {
            const pwet = users;
            return res.json(pwet);
        })
        .catch(err => next(err));
});


function createUser(req) {
    const newUser = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        address: req.body.address,
        contactDetails: req.body.contactDetails,
    }

    return User.create(newUser)
}

router.post('/', (req, res, next) => {
    if(!req.body.username || 
       !req.body.email || 
       !req.body.password ||
       !req.body.address ||
       !req.body.contactDetails) {
        res.status(400).send("all fields are required");
    } else {
        User.findOne({$or: [{ email: req.body.email }, { username: req.body.username }]})
            .select('username email')
            .then(user => {
                if(user) {
                    const err = new Error('User with that email already exists');
                    err.status = 400;
                    return next(err);
                } else {
                    return null;
                }
            })
            .then(user => createUser(req))
            .then(user => res.status(201).json(user))
            .catch(err => next(err));
    }
});

router.get('/:uID', (req, res, next) => {
    res.json(req.user);
});

router.delete('/:uID', (req, res, next) => {
    req.user.remove()
        .then(user => res.send(`${user.username} removed`))
        .catch(err => next(err));
})

router.put('/:uID', (req, res, next) => {
    if (req.body.username || req.body.email) {
        const err = new Error('Cannot update username or email');
        err.status = 400;
        return next(err);
    } else {
        req.user.update(req.body)
            .then(info => res.json(info))
            .catch(err => next(err));
    }
});


router.get('/:uID/orders', (req, res, next) => {
    Order.find({user_id: req.user.id})
        .then(orders => res.json(orders))
        .catch(err => next(err));
});

router.post('/:uID/orders', (req, res, next) => {
    if(!req.body.quantity || !req.body.weight) {
        const err = new Error('Quantity and Weight requried');
        err.status = 400;
        return next(err);
    } else {
        Order.create({
            quantity: req.body.quantity,
            weight: req.body.weight,
            user_id: req.user._id
        }).then(order => res.json(order))
        .catch(err => next(err));
    }
});

router.get('/:uID/orders/:oID', (req, res, next) => {
    res.redirect(307, `/orders/${req.params.oID}`)
})

router.put('/:uID/orders/:oID', (req, res, next) => {
    res.redirect(307, `/orders/${req.params.oID}`)
})

router.delete('/:uID/orders/:oID', (req, res, next) => {
    res.redirect(307, `/orders/${req.params.oID}`)
})

module.exports = router;