const express = require("express");
const db = require("../models/db");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const CC = require('../constants');

//Middlewares
const auth = require('../middlewares/auth');

//TODO remove route during production
router.get("/", async (req, res) => {
    res.send({
        message: "Hello world"
    })
})

//Form Submission ENd point Support and Demo Forms
router.post("/submitform", async (req, res) => {
    let name = req.body.name;
    let companyName = req.body.companyName;
    let phone = req.body.phone;
    let email = req.body.email;
    let description = req.body.description;
    let typeRequest = req.body.typeRequest;
    if (typeRequest === 'Demo' || typeRequest === 'Support') {
        const sql = `INSERT INTO queryForms(name,companyName,phone,email,description,typeRequest)VALUES('${name}','${companyName}','${phone}','${email}','${description}','${typeRequest}') `;
        try {
            let results = await db.query(sql);
            if (results.results.affectedRows === 1 && results.results.warningCount === 0) {
                res.send({
                    message: "Form Submitted Successfully"
                })
            } else {
                res.send({
                    message: "Error Submiting Form"
                });
            }

        } catch (error) {
            res.send({
                message: "Error Submiting Form"
            });
        }
    } else {
        res.send({
            message: "Error Submiting Form"
        });
    }

})

//Login Route
router.post("/login", async (req, res) => {
    let companyname = req.body.companyname;
    let username = req.body.username;
    let password = req.body.password;
    const sql = `SELECT user.userId,user.empId,user.emailId,user.teamId,user.managerId,user.name as name,user.firstname,user.profilePic,user.profileThumbnailUrl,user.isManager,user.isActive,user.password,user.previousPassword FROM user,company WHERE user.companyId = company.companyId AND company.name='${companyname}' AND (user.empId ='${username}' or user.emailId ='${username}') `;
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
            let id = results[0].userId;
            let email = results[0].emailId;
            let name = results[0].name;
            let firstname = results[0].firstname;
            let profilePic = results[0].profilePic;
            let profileThumbnailUrl = results[0].profileThumbnailUrl;
            let isManager = results[0].isManager;
            let previousPassword = results[0].previousPassword;
            let managerId = results[0].managerId;
            bcrypt.compare(password, haspass, async function (err, result) {
                if (result) {
                    const token = jwt.sign({
                        userId: id
                    }, CC.SECRET_KEY, {
                        expiresIn: '3h'
                    });
                    let dropdown = [];
                    dropdown.push({
                        "id": id,
                        "name": name
                    })
                    if (managerId === 0) {
                        const dropDownQuery = `SELECT userId, name FROM user WHERE isManager = 1 AND userId NOT IN (${id}) `;
                        let dropDownResults = await db.query(dropDownQuery)
                        dropDownResults.results.forEach((element) => {
                            dropdown.push({
                                "id": element.userId,
                                "name": element.name
                            })
                        });
                        res.send({
                            token,
                            "userId": id,
                            isManager,
                            dropdown,
                            email,
                            firstname,
                            profilePic,
                            profileThumbnailUrl,
                            previousPassword
                        })
                    } else {
                        if (isManager === 1) {
                            async function generate_dropdown(a) {
                                let ids = '';
                                a.forEach((el) => {
                                    if (ids.length === 0) {
                                        ids = ids + el.userId;
                                    } else {
                                        ids = ids + ',' + el.userId;
                                    }
                                });
                                if (ids.length > 0) {
                                    let sq = `SELECT userId, name FROM user WHERE managerId IN(${ids}) AND isManager = 1`;
                                    let ds = await db.query(sq);
                                    ds.results.forEach((element) => {
                                        dropdown.push({
                                            "id": element.userId,
                                            "name": element.name
                                        })
                                    });
                                    generate_dropdown(ds.results);
                                }
                            }
                            const sql2 = `SELECT userId, name FROM user WHERE managerId = ${id} AND isManager = 1`;
                            let dropquery = await db.query(sql2);
                            dropquery.results.forEach(async (element) => {
                                dropdown.push({
                                    "id": element.userId,
                                    "name": element.name
                                })
                            });
                            if (dropquery) {
                                generate_dropdown(dropquery.results)
                            }
                            res.send({
                                token,
                                "userId": id,
                                isManager,
                                dropdown,
                                email,
                                firstname,
                                profilePic,
                                profileThumbnailUrl,
                                previousPassword
                            })
                        } else {
                            res.send({
                                token,
                                "userId": id,
                                isManager,
                                email,
                                firstname,
                                profilePic,
                                profileThumbnailUrl,
                                previousPassword
                            })
                        }
                    }

                } else {
                    res.send({
                        message: "Invalid Credentials"
                    });
                }
            })
        }
    } catch (error) {
        res.send({
            message: "Error in Login",
            message: error
        })
    }
})

//Forgot Password Route

router.post("/forgotpass", async (req, res) => {
    //TODO Develop Forgot password
})

//Update Pass route
router.post("/updatepass", auth, async (req, res) => {
    let userId = req.userId;
    let password = req.body.password;
    let oldPass;
    const sql = `SELECT password from user where userId =${userId}`;
    let {
        results
    } = await db.query(sql);
    oldPass = results[0].password;
    bcrypt.compare(password, oldPass, function (err, result) {
        if (result === true) {
            res.send({
                message: "You can't use the Previous Password"
            })
        } else {
            bcrypt.hash(password, 10, async function (err, hash) {
                if (hash) {
                    const sql1 = `UPDATE user set password = '${hash}',previousPassword='${oldPass}' where userId =${userId} `;
                    try {
                        let {
                            results
                        } = await db.query(sql1);
                        if (results) {
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
            })
        }
    })
})

//manager based query
async function get_managers(teamId) {
    let manager_array = []
    const sql = `SELECT userId, empId, emailId, teamId, startDate, name, firstname, profilePic, profileThumbnailUrl, isManager, isActive, onlineStatus from user WHERE teamId = ${teamId} AND isManager = 1`;
    let managers = await db.query(sql);
    manager_array.push(managers.results)
    manager_array = manager_array[0]
    return manager_array;
}
async function team_summary(teamid, userId) {
    teamSummary = [];
    const tn = `SELECT name from team WHERE teamId =${teamid}`;
    let teamname = await db.query(tn);
    team = teamname.results[0].name;
    const sql = `SELECT count(userId) as total_employees FROM user WHERE teamId = ${teamid}`;
    let total_employees = await db.query(sql);
    te = total_employees.results[0].total_employees;
    const sql1 = `SELECT  count(userId) as active FROM user WHERE teamId = ${teamid} and onlineStatus ='active'`;
    let active = await db.query(sql1);
    ta = active.results[0].active;
    const sql2 = `SELECT count(userId) as inactive FROM user WHERE teamId = ${teamid} and onlineStatus ='passive'`;
    let inactive = await db.query(sql2);
    ti = inactive.results[0].inactive;
    const sql3 = `SELECT count(userId) as offline FROM user WHERE teamId = ${teamid} and onlineStatus ='offline'`;
    let offline = await db.query(sql3);
    to = offline.results[0].offline;
    teamSummary = {
        userId,
        team,
        "total_employees": te,
        "active": ta,
        "inactive": ti,
        "offline": to
    }
    return teamSummary
}
async function get_teams(userId) {
    const sql = `SELECT teamId from team WHERE managerId =${userId}`;
    let teams = await db.query(sql);
    return teams.results;
}
async function manager_summary(teamId) {
    let ma = []
    let ms = []
    const sql = `SELECT userId from user WHERE teamId = ${teamId} AND isManager = 1`;
    let managerId = await db.query(sql);
    ma.push(managerId.results)

    if (ma[0].length > 1) {
        for (let i = 0; i < ma[0].length; i++) {
            let teams = await get_teams((ma[0][i].userId));
            for (let j = 0; j < teams.length; j++) {
                let ts = await team_summary(teams[j].teamId, ma[0][i].userId)
                ms.push(ts)
            }
        }
    }
    return ms;
}
async function get_users(teamId) {
    const sql = `SELECT userId, empId, emailId, teamId, startDate, name, firstname, profilePic, profileThumbnailUrl, isManager, isActive, onlineStatus from user WHERE teamId = ${teamId} AND isManager = 0`;
    let users = await db.query(sql);
    return users.results;
}

router.get("/manager/:userid", auth, async (req, res) => {
    let userId = req.params.userid;
    let results = [];
    const checkquery = `SELECT teamId,managerId,isManager from user WHERE userId = ${userId}`;
    let checkResults = await db.query(checkquery);
    let teamId = checkResults.results[0].teamId;
    let managerId = checkResults.results[0].managerId;
    let isManager = checkResults.results[0].isManager;
    if (isManager === 1) {
        const sql = `SELECT teamId,name from team WHERE managerId = ${userId}`;
        let teamresultsquery = await db.query(sql);
        let mainteams = teamresultsquery.results;
        results.push(mainteams);

        for (let i = 0; i < mainteams.length; i++) {
            let managers = await get_managers(mainteams[i].teamId);
            results[0][i].managers = managers;
            let managersummary = await manager_summary(mainteams[i].teamId);
            results[0][i].summary = managersummary;
            let users = await get_users(mainteams[i].teamId);
            results[0][i].users = users;
        }
        results = results[0]
        res.send({
            results
        })
    } else {
        const teamquery = `SELECT name from team WHERE teamId = ${teamId}`;
        let teamqueryResults = await db.query(teamquery);
        let teamName = teamqueryResults.results[0].name;
        const sql3 = `SELECT userId,empId,emailId,teamId,startDate,name,firstname,profilePic,profileThumbnailUrl,isManager,isActive,onlineStatus from user WHERE teamId = ${teamId}`;
        let teamusersquery = await db.query(sql3);
        let teamusers = teamusersquery.results;
        res.send({
            teamName,
            teamusers,
        })
    }

})

module.exports = router;