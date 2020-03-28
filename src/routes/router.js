const express = require("express");
const db = require("../models/db");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');

router.get("/", async (req, res) => {
    res.send({
        message: "Hello"
    })
})

router.get("/login", async (req, res) => {
    let password = "123456";
    let hashedpassword = `$2a$10$IR82u9x1Z.ivKPZcT8Bp1eGRh6uhBk87eg6OOXFbf01JAhLINmODK`;
    bcrypt.compare(password, hashedpassword, function (err, res1) {
        if (res1) {
            res.send({
                message: "Passwords Match"
            })
        } else {
            res.send({
                message: "Passwords Doesn't Match"
            })
        }
    })
})

module.exports = router;