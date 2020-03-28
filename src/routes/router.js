const express = require("express");
const db = require("../models/db");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const CC = require('../constants');

//Middlewares
const auth = require('../middlwares/auth');

//Login Route

router.post("/login", async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    const sql = `SELECT managerId,username,email,password,firstname,pic,favicon,password_updated
                FROM manager
                WHERE username ='${username}' or email ='${username}'`;

    try {
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
            let username = results[0].username;
            let email = results[0].email;
            let firstname = results[0].firstname;
            let pic = results[0].pic;
            let favicon = results[0].favicon;
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
                        username,
                        email,
                        firstname,
                        pic,
                        favicon,
                        password_updated
                    })
                } else {
                    res.send({
                        message: "Invalid Credentials"
                    });
                }
            })
        }
    } catch (error) {
        res.send({
            message: "Error in Login"
        })
    }
})

//Update Pass route

router.post("/updatepass", auth, async (req, res) => {
    let managerId = req.managerid;
    let password = req.body.password;
    if (password) {
        bcrypt.hash(password, 10, async function (err, hash) {
            if (hash) {
                const sql = `UPDATE manager SET password='${hash}',password_updated = 1
            WHERE managerId = ${managerId}`;
                try {
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
                } catch (error) {
                    res.send({
                        message: "Error Updating Password"
                    });
                }
            }
        });
    } else {
        res.send({
            message: "Please Provide Password"
        })
    }

})

//reset

router.post("/reset", auth, async (req, res) => {
    let managerId = req.managerid;
    const sql = `UPDATE manager SET password_updated = 0
            WHERE managerId = ${managerId}`;

    let {
        results
    } = await db.query(sql);

    if (results) {
        res.send({
            message: "Success"
        })
    }
})

//Get teams based on manager id

router.get("/teams", auth, async (req, res) => {
    let managerId = req.managerid;
    const sql = `SELECT teamId,companyId,name FROM team WHERE managerId= ${managerId}`;
    try {
        let {
            results
        } = await db.query(sql);
        if (Object.keys(results).length === 0) {
            res.send({
                message: "No teams found"
            });
        } else {
            res.send({
                teams: results
            });
        }
    } catch (error) {
        res.send({
            message: "Error Fetching Teams"
        });
    }
})

//Get users based on teams

router.get("/teams/:teamid", auth, async (req, res) => {
    let teamId = req.params.teamid;
    const sql = `SELECT empId,emailId,startDate,lastDate,name,firstname,pic,favicon,title,level,address,city,state,pincode,country,isActive,fixedSalary,hourlyRate,staffingCompany,onlineStatus FROM user WHERE teamId= ${teamId}`;

    try {
        let {
            results
        } = await db.query(sql);
        if (Object.keys(results).length === 0) {
            res.send({
                message: "No Users found"
            });
        } else {
            res.send({
                users: results
            });
        }
    } catch (error) {
        res.send({
            message: "Error Fetching Users"
        })
    }

})

module.exports = router;