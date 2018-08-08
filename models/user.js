'use strict';

const bcrypt = require('bcrypt');
const mongoose = require('mongoose')
const Schema = mongoose.Schema;

// file imports
const Order = require('./order');


const requiredString = { type: String, required: true, trim: true };
const uniqueString = { type: String, required: true, unique: true, trim: true };


const UserSchema = new Schema({
    username: uniqueString,
    email: uniqueString,
    address: {
        streetAddress: requiredString,
        city: requiredString,
        state: requiredString,
        postalCode: requiredString
    },
    contactDetails: 
        [{
            contactType: {
                type: String,
                enum: ['mobile', 'landline'],
                required: true
            },
            contactNumber: requiredString
        }],

    password: { type: String, required: true },
    
    resetPasswordToken: String,
    resetPasswordTokenExpiration: Date

});


// hash before saving pw 'save' is a Mongoose middleware
// need to use function keyword to establish 'this'..arrow function does not work
UserSchema.pre('save', function (next) {
    const user = this;
    bcrypt.hash(user.password, 10, (err, hash) => {
        if (err) {
            return next(err);
        } else {
            user.password = hash;
            return next();
        }
    });
});

UserSchema.pre('remove', function(next) {
    const user = this;
    Order.find({username: this.username}).remove()
        .then(info => next())
        .catch(err => next(err));
});

const User = mongoose.model('User', UserSchema);
module.exports = User;


// Create/Update admin user
bcrypt.hash(process.env.ADMIN_PW, 10, (err, hash) => {
    if (err) {
        console.error(err);
    } else {
        process.env.ADMIN_PW = hash;
        User.findOneAndUpdate({username: process.env.ADMIN_UNAME},{
            username: process.env.ADMIN_UNAME,
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PW,
            
            address: {
                streetAddress: "default",
                city: "default",
                state: "default",
                postalCode: "default"
            },
            contactDetails: 
                [{
                    contactType: "landline",
                    contactNumber: "555555"
                }]
        }, {upsert:true}).exec()
        .then(admin => console.log(`${admin.username} created`))
        .catch(err => console.error(err));
    }
});
