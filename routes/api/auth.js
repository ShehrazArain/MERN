const express = require("express")
const router = express.Router()
const bcrypt = require('bcryptjs')
const auth = require('../../middleware/auth')
const jwt = require("jsonwebtoken")
const config = require("config")
const { check, validationResult } = require("express-validator")

const User = require('../../models/User')

// @route    GET api/auth
// @desc     Authentication
// @access   Public
router.get("/", auth, async (req, res) => {
    try {
       const user = await User.findById(req.user.id).select('-password')
       res.json(user);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error')
    }
});


// @route    POST api/auth
// @desc     Authenticate user & get token (for login )
// @access   Public

// all same as registeration
router.post('/', 
[
    // name is not require in login
    check('email', "Unique Email is require").isEmail(),
    check('password', "Password is required").exists()
],
async (req, res) => { 
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() })
    }

    // from req.body getting email and password. in login(request) time user time
    const { email, password } = req.body;
    try {
    // see if user doesn't exists
    let user = await User.findOne({ email }); 
    if(!user) {
       return res.status(400).json({ errors: [{ msg: "Invalid Credentials"}] });
    }

    // passward is from req.body(in login time) & user.password is related to user that already registered.
    // and camparing both of them
    const isMatch = await bcrypt.compare(password, user.password)

    if(!isMatch) {
           return res.status(400).json({ errors: [{ msg: "Invalid Credentials"}] });
    }

    // if password match.. do this
    // Return Jsonwebtoken    
    const payload = {
        user: {
            id: user.id
        }
    }
    jwt.sign(
        payload, 
        config.get('jwtSecret'),
        { expiresIn: 360000 },
        (err, token) => {
            if(err) throw err;
            res.json({ token });
        }
    );

    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
