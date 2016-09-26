// app/models/user.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
var random   = require('mongoose-simple-random');

// define the schema for our user model
var userSchema = mongoose.Schema({
    local                : {
        email            : String,
        password         : String
    },
    instagram            : {
        id               : String,
        token            : String,
        username         : String,
        full_name        : String,
        bio              : String,
        profile_picture  : String,
        website          : String,
        hashtags         : [ 
            {
                tag             : String,
                location        : String,
                score           : Boolean,
                description     : String
            }
        ]
    }

});

// methods ======================

userSchema.plugin(random);

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
