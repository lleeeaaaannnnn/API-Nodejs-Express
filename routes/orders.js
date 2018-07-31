'use strict';

const express = require('express');
const router = express.Router();

// file imports
const User = require('../models/user');
const Order = require('../models/order');


function validateUserId(req, res, next) {
    User.findById(req.body.user_id)
        .then(user => {
            if(user) {
                next();
            } else {
                const err = new Error(`${req.body.user_id} is not an existing user`);
                err.status = 404;
                next(err);
            }
        })
        .catch(err => next(err));
}

router.param('oID', (req, res, next, orderID) => {
    Order.findById(orderID)
        .then(order => {
            if(order) {
                req.order = order;
                return next();
            } else {
                const err = new Error(`Order with id: ${orderID} not found`);
                err.status = 404;
                return next(err);
            }
        })
        .catch(err => next(err))
});

router.get('/', (req, res, next) => {
    Order.find()
        .then(orders => res.json(orders))
        .catch(err => next(err));    
});

router.post('/', validateUserId, (req, res, next) => {
    if(!req.body.user_id || !req.body.quantity || !req.body.weight) {
        const err = new Error('Incomplete details');
        err.status = 400;
        next(err);
    } else {
        Order.create({
            user_id: req.body.user_id,
            quantity: req.body.quantity,
            weight: req.body.weight
        })
        .then(order => res.json(order))
        .catch(err => next(err))
    }
});


router.get('/:oID', (req, res, next) => {
    res.json(req.order);
});

router.put('/:oID', (req, res, next) => {
    console.log(`utot: ${req.body.status}`);
    req.order.update({ status: req.body.status })
        .then(order => res.json(order))
        .catch(err => next(err));
});

router.delete('/:oID', (req, res, next) => {
    req.order.remove()
        .then(order => res.json({ success: `${order._id} deleted`}))
        .catch(err => next(err));
});



module.exports = router;