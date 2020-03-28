const express = require("express");
const db = require("../models/db");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const CC = require('../constants');

//Middlewares

const auth = require('../middlwares/auth');
router.get("/", async (req, res) => {
    res.send({
        message: "Hello"
    })
})

router.post("/login", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    const sql = `SELECT managerId,username,email,password,password_updated
                FROM manager
                WHERE username ='${username}' or email ='${username}'`;
    let {
        results
    } = await db.query(sql);
    if (Object.keys(results).length === 0) {
        res.send({
            message: "Invalid Credentials"
        });
    } else {
        let haspass = results[0].password;
        let id = results[0].managerId;
        let password_updated = results[0].password_updated;
        bcrypt.compare(password, haspass, function (err, result) {
            if (result) {
                const token = jwt.sign({
                    managerid: id
                }, CC.SECRET_KEY, {
                    expiresIn: '3h'
                });
                res.send({
                    token,
                    password_updated
                })
            } else {
                res.send({
                    message: "Invalid Credentials"
                });
            }
        })
    }
})

router.post("/updatepass", auth, async (req, res) => {
    let managerId = req.managerid;
    let password = req.body.password;
    if (password) {
        bcrypt.hash(password, 10, async function (err, hash) {
            console.log(hash);

            if (hash) {
                const sql = `UPDATE manager SET password='${hash}',password_updated = 1
            WHERE managerId = ${managerId}`;
                let {
                    results
                } = await db.query(sql);
                if (Object.keys(results).length === 0) {
                    res.send({
                        message: "Error Updating Password"
                    });
                } else {
                    res.send({
                        message: "Password Updated Succesfully"
                    })
                }
            }
        });
    } else {
        res.send({
            message: "Please Provide Password"
        })
    }

})
module.exports = router;