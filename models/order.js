'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PRICE_PER_KG = 20; // price per KG..store in props variable
const ORDER_STATUSES = ['PickedUp', 'Washed', 'ForDelivery'];

const OrderSchema = new Schema({
    user_id: { 
        type: String,
        required: true,
        trim: true
    },
    quantity: Number,
    weight: Number,
    price: Number,
    deliveryDate: Date,
    pickupDate: Date,
    status: { 
        type: String, 
        trim: true,
        enum: ORDER_STATUSES,
        default: 'PickedUp' 
    }
});

OrderSchema.methods.update = function(updates) {
    return new Promise((pass, fail) => {
        console.log(this)
        if(ORDER_STATUSES.includes(updates.status)){
            Object.assign(this, updates);
            return pass(this.save());
        } else {
            const err = new Error('Invalid Status');
            err.status = 400;
            fail(err);
        }
    })
};

OrderSchema.pre('save', function(next) {
    const pickupDate = new Date();
    const deliveryDate = new Date().setDate(pickupDate.getDate() + 3);
    this.price = this.weight * PRICE_PER_KG;
    this.pickupDate = pickupDate;
    this.deliveryDate = deliveryDate;
    next();
});

const Order = mongoose.model('Order', OrderSchema);
module.exports = Order;