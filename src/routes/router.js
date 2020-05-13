const express = require("express");
const db = require("../models/db");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const CC = require('../constants');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
//Middlewares
const auth = require('../middlewares/auth');

//AWS
const cloudFront = new AWS.CloudFront.Signer(CC.cfpublickey, CC.cfprivateKey);

//Functions
//Get Name from UserId
async function getManagerName(userId) {
    try {
        let m = []
        let MN = `SELECT userId,name
            FROM user 
            WHERE userId  =${userId}`;
        let MNR = await db.query(MN);
        let n = await getTeams(userId);
        if (n.length > 1) {
            m.push({
                userId: userId,
                name: MNR.results[0].name + '\'s Teams'
            })
        } else {
            m.push({
                userId: userId,
                name: MNR.results[0].name + '\'s Team'
            })
        }

        return m[0];
    } catch (e) {
    }
}

//Get Userid from Team Id
async function getUserIdfromTeam(teamId) {
    try {
        let Uid = `SELECT userId
                FROM user
                WHERE teamId =${teamId} AND isManager = 1`;
        let UidR = await db.query(Uid);
        return UidR.results;
    } catch (e) {

    }
}

//Get teams of the User

async function getTeams(userId) {
    try {
        let TQ = `SELECT team.teamId,team.name
            FROM team 
            WHERE managerId = ${userId}`;
        let TQR = await db.query(TQ);
        return TQR.results
    } catch (e) {
    }
}

//Get Array Size
function getarraysize(array) {
    return array.length
}

//Function to Generate Dropdown

async function generate_dropdown(userId) {
    try {
        let dp = [];
        //Get the main team of user
        let MQ = `SELECT user.teamId,team.name
            FROM user,team 
            WHERE user.userId = ${userId} AND user.teamId = team.teamId`;
        let MQR = await db.query(MQ);
        dp.push(MQR.results[0])
        await a(userId);
        //get the teams of user
        async function a(userId) {
            let T = await getTeams(userId);
            let mn = await getManagerName(userId)
            dp[getarraysize(dp)] = mn
            dp[getarraysize(dp) - 1]['teams'] = T;
            // if (T.length > 1) {
            //     let mn = await getManagerName(userId)
            //     dp[getarraysize(dp)] = mn
            //     dp[getarraysize(dp) - 1]['teams'] = T;
            // } else {
            //     dp[getarraysize(dp)] = T;
            // }
            for (let i = 0; i < T.length; i++) {
                let uid = await getUserIdfromTeam(T[i].teamId);
                if (uid) {
                    for (let j = 0; j < uid.length; j++) {
                        await a(uid[j].userId)
                    }
                } else {
                    return
                }
            }
        }
        return dp;
    } catch (e) {
    }
}

//Function to Create Token

async function create_token(id, expiresIn) {
    const token = jwt.sign({
        userId: id
    }, CC.SECRET_KEY, {
        expiresIn
    });
    return token;
}

//Function to Validate Token
async function validate_token(token) {
    let r;
    jwt.verify(token, CC.SECRET_KEY, async (err) => {
        if (err) {
            r = "Invalid";
        } else {
            r = "Valid";
        }
    })
    return r;
}

//TODO online status based on timestamp
async function onlineStatus(timestamp) {

}
//TODO Update Onlinestatus based on Timestamp
//manager based query
async function get_managers(teamId) {
    let results = [];
    const sql = `SELECT userId, empId, emailId, teamId, startDate, name, firstname, profilePic, profileThumbnailUrl, isManager, isActive, onlineStatus,onlineStatusTimestamp,city,message,skype,mobile  from user WHERE teamId = ${teamId} AND isManager = 1`;
    let users = await db.query(sql);
    for (let i = 0; i < users.results.length; i++) {
        let r = {
            userId: users.results[i].userId,
            empId: users.results[i].empId,
            emailId: users.results[i].emailId,
            teamId: users.results[i].teamId,
            startDate: users.results[i].startDate,
            name: users.results[i].name,
            firstname: users.results[i].firstname,
            profilePic: users.results[i].profilePic,
            profileThumbnailUrl: users.results[i].profileThumbnailUrl,
            isActive: users.results[i].isActive,
            onlineStatus: users.results[i].onlineStatus,
            onlineStatusTimestamp: users.results[i].onlineStatusTimestamp,
            city: users.results[i].city,
            message: users.results[i].message,
            skype: users.results[i].skype,
            mobile: users.results[i].mobile
        }
        results.push(r)
    }
    return results;
}

async function get_users(teamId) {
    let results = [];
    const sql = `SELECT userId, empId, emailId, teamId, startDate, name, firstname, profilePic, profileThumbnailUrl, isManager, isActive, onlineStatus,onlineStatusTimestamp,city,message,skype,mobile  from user WHERE teamId = ${teamId} AND isManager = 0`;
    let users = await db.query(sql);
    for (let i = 0; i < users.results.length; i++) {
        let r = {
            userId: users.results[i].userId,
            empId: users.results[i].empId,
            emailId: users.results[i].emailId,
            teamId: users.results[i].teamId,
            startDate: users.results[i].startDate,
            name: users.results[i].name,
            firstname: users.results[i].firstname,
            profilePic: users.results[i].profilePic,
            profileThumbnailUrl: users.results[i].profileThumbnailUrl,
            isActive: users.results[i].isActive,
            onlineStatus: users.results[i].onlineStatus,
            onlineStatusTimestamp: users.results[i].onlineStatusTimestamp,
            city: users.results[i].city,
            message: users.results[i].message,
            skype: users.results[i].skype,
            mobile: users.results[i].mobile
        }
        results.push(r)
    }
    return results;
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
        teamId: teamid,
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

function teams_splitter(resl) {
    let result = new Set();
    resl.reduce(function (r, a) {
        r[a.userId] = r[a.userId] || [];
        r[a.userId].push(a);
        result.add(r[a.userId])
        return r;
    }, Object.create(null));
    return Array.from(result);
}

async function urlSigner(url1) {
    const cloudFront = new AWS.CloudFront.Signer(CC.cfpublickey, CC.cfprivateKey);
    let uu = cloudFront.getSignedUrl({
        url: url1,
        expires: Math.floor((new Date()).getTime() / 1000) + (60 * 60 * 1)
    })
    return uu;
}

function toISOLocal(d) {
    var z = n => ('0' + n).slice(-2);
    var zz = n => ('00' + n).slice(-3);
    var off = d.getTimezoneOffset();
    var sign = off < 0 ? '+' : '-';
    off = Math.abs(off);

    return d.getFullYear() + '-'
        + z(d.getMonth() + 1) + '-' +
        z(d.getDate()) + 'T' +
        z(d.getHours()) + ':' +
        z(d.getMinutes()) + ':' +
        z(d.getSeconds()) + '.' +
        zz(d.getMilliseconds()) +
        sign + z(off / 60 | 0) + ':' + z(off % 60);
}
function startOfWeek(date) {
    date = new Date(date);
    var diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}
function endOfWeek(date) {
    var lastday = date.getDate() - (date.getDay() - 1) + 6;
    return new Date(date.setDate(lastday));
}
function groupBy(arr, key) {
    return (arr || []).reduce((acc, x = {}) => ({
        ...acc,
        [x[key]]: [...acc[x[key]] || [], x]
    }), {})
}
async function getTeamMembers(teamId) {
    const sql = `SELECT userId ,name 
                FROM user
                WHERE teamId =${teamId}
                ORDER BY name ASC`;
    let sqlR = await db.query(sql);
    return sqlR.results;
}
//Routes
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
    const sql = `SELECT user.userId,user.companyId,user.empId,user.emailId,user.teamId,user.managerId,user.name as name,user.firstname,user.profilePic,user.profileThumbnailUrl,user.isManager,user.isActive,user.password,user.previousPassword FROM user,company WHERE user.companyId = company.companyId AND company.name='${companyname}' AND (user.empId ='${username}' or user.emailId ='${username}') `;
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
            let companyId = results[0].companyId;
            let email = results[0].emailId;
            let name = results[0].name;
            let firstname = results[0].firstname;
            let profilePic = results[0].profilePic;
            let profileThumbnailUrl = results[0].profileThumbnailUrl;
            let isManager = results[0].isManager;
            let previousPassword = results[0].previousPassword;
            let managerId = results[0].managerId;
            const policy = JSON.stringify({
                Statement: [
                    {
                        Resource: CC.cfurl + companyId + '/*',
                        Condition: {
                            DateLessThan: {
                                'AWS:EpochTime':
                                    Math.floor(new Date().getTime() / 1000) + 60 * CC.cookieexpiry, // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
                            },
                        },
                    },
                ],
            });
            const cookie = cloudFront.getSignedCookie({
                policy,
            });
            bcrypt.compare(password, haspass, async function (err, result) {
                if (result) {
                    const token = await create_token(id, '3h')
                    if (isManager === 1) {
                        let dp = await generate_dropdown(id);
                        if (dp) {
                            res.send({
                                token,
                                cookieexpiry: CC.cookieexpiry,
                                domain: '.' + CC.cfdomain,
                                path: '/',
                                httpOnly: true,
                                "CloudFront-Key-Pair-Id": cookie['CloudFront-Key-Pair-Id'],
                                "CloudFront-Policy": cookie['CloudFront-Policy'],
                                "CloudFront-Signature": cookie['CloudFront-Signature'],
                                "userId": id,
                                isManager,
                                dropdown: dp,
                                email,
                                firstname,
                                profilePic,
                                profileThumbnailUrl,
                                previousPassword
                            })
                        }
                    } else {
                        res.send({
                            token,
                            cookieexpiry: CC.cookieexpiry,
                            domain: '.' + CC.cfdomain,
                            path: '/',
                            httpOnly: true,
                            "CloudFront-Key-Pair-Id": cookie['CloudFront-Key-Pair-Id'],
                            "CloudFront-Policy": cookie['CloudFront-Policy'],
                            "CloudFront-Signature": cookie['CloudFront-Signature'],
                            "userId": id,
                            isManager,
                            email,
                            firstname,
                            profilePic,
                            profileThumbnailUrl,
                            previousPassword
                        })
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
    let username = req.body.username;
    const sql = `SELECT userId,empId,emailId FROM user WHERE empId = '${username}' or emailId= '${username}'`;
    let userQuery = await db.query(sql);
    if (userQuery.results.length > 0) {
        let id = userQuery.results[0].userId;
        let emailId = userQuery.results[0].emailId;
        if (id) {
            const token = await create_token(id, '3h');
            try {
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'jayanth.m1995@gmail.com', // generated ethereal user
                        pass: 'i@143magge' // generated ethereal password
                    }
                });
                let info = await transporter.sendMail({
                    from: 'jayanth.m1995@gmail.com',
                    to: emailId,
                    subject: "Password Reset",
                    html: `<div>
                <h1> Update Password</h1>
                <span> To Update click the below link and follow the steps
                </span><br/>
                <span>
                <b>Token will expire in 3 hrs</b>
                </span><br/>
                <a href='${CC.RESETPASSLINK}/${token}'>Click here to Reset</a>
                </div>` // html body
                });
                if (info['accepted'].length > 0) {
                    res.send({
                        message: "Email Sent to registered Address"
                    })
                } else {
                    res.send({
                        message: "Error Sending Email"
                    })
                }
            } catch (error) {
                res.send({
                    message: "Error Sending Email"
                })
            }
        }
    } else {
        res.send({
            message: "No User Found"
        })
    }
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
            let r = []
            results[0][i].managers = [];
            let managers = await get_managers(mainteams[i].teamId);
            for (let j = 0; j < managers.length; j++) {
                r.push([managers[j]])
            }
            let managersummary = await manager_summary(mainteams[i].teamId);
            let rr = teams_splitter(managersummary);
            for (let k = 0; k < rr.length; k++) {
                r[k].push(rr[k])
            }
            results[0][i].managers = r;
            let users = await get_users(mainteams[i].teamId);
            results[0][i].users = users;
        }
        results = results[0]
        res.send({
            results
        })
    } else {
        const teamquery = `SELECT teamId,name from team WHERE teamId = ${teamId}`;
        let teamqueryResults = await db.query(teamquery);
        results.push(teamqueryResults.results[0]);
        let r = []
        results[0].managers = [];
        let managers = await get_managers(teamqueryResults.results[0].teamId);
        for (let j = 0; j < managers.length; j++) {
            r.push([managers[j]])
        }
        results[0].managers = r;
        let users = await get_users(teamqueryResults.results[0].teamId);
        results[0].users = users;
        res.send({
            results,
        })
    }

})

router.get("/teams/:teamid", auth, async (req, res) => {
    let results = [];
    let teamId = req.params.teamid;
    const teamquery = `SELECT teamId,name from team WHERE teamId = ${teamId}`;
    let teamqueryResults = await db.query(teamquery);
    results.push(teamqueryResults.results[0]);
    let r = []
    results[0].managers = [];
    let managers = await get_managers(teamId);
    for (let j = 0; j < managers.length; j++) {
        r.push([managers[j]])
    }
    let managersummary = await manager_summary(teamId);
    let rr = teams_splitter(managersummary);
    for (let k = 0; k < rr.length; k++) {
        r[k].push(rr[k])
    }
    results[0].managers = r;
    let users = await get_users(teamId);
    results[0].users = users;
    res.send({
        results,
    })
})

router.post("/validate", async (req, res) => {
    let r = await validate_token(req.body.token);

    if (r) {
        res.send({
            message: r
        })
    }
})

router.post('/deepdivedropdown', auth, async (req, res) => {
    let results;
    let managerId = req.body.managerId;
    let teamId = req.body.teamId;
    if (managerId || teamId) {
        if (managerId && teamId) {
            res.send({
                message: "Both ManagerId and Teamid Passed"
            })
        } else {
            if (managerId) {
                const getTeamId = `SELECT teamId
                                    FROM user   
                                    WHERE userId = ${managerId}`;
                let getTeamIdR = await db.query(getTeamId);
                results = await getTeamMembers(getTeamIdR.results[0].teamId)
            }
            if (teamId) {
                results = await getTeamMembers(teamId);
            }
            if (results) {
                res.send(results)
            }
        }
    } else {
        res.send({
            message: "Missing Fields"
        })
    }
})

router.post("/deepdive/", auth, async (req, res) => {
    let results = [];
    try {
        let userId = req.body.userId;
        if (userId) {
            let date;
            if (req.body.date) {
                date = new Date(req.body.date);
            } else {
                date = new Date();
            }
            Date.prototype.addDays = function (days) {
                var dat = new Date(this.valueOf())
                dat.setDate(dat.getDate() + days);
                return dat;
            }

            function getDates(startDate, stopDate) {
                var dateArray = new Array();
                var currentDate = startDate;
                while (currentDate <= stopDate) {
                    dateArray.push(toISOLocal(currentDate).split('T')[0])
                    currentDate = currentDate.addDays(1);
                }
                return dateArray;
            }
            var dateArray = getDates(startOfWeek(date), endOfWeek(date));
            let rr = [];
            async function query(date, userId) {
                let r1 = []
                const dq = `SELECT DAYNAME(timecard)as tday,HOUR(timecard) as hour,TIME(timecard) as time,timecardId,timecard,clientId,keyCounter,mouseCounter,appName,windowName,windowUrl,screenshotUrl,webcamUrl,flagged,status,focus,intensityScore FROM timecard WHERE userId=${userId} AND DATE(timecard) = '${date}'`;
                let dqr = await db.query(dq);
                if (dqr.results.length > 0) {
                    let deepdive = dqr.results;
                    for (let i = 0; i < deepdive.length; i++) {
                        let r = {
                            timecardId: deepdive[i].timecardId,
                            tday: deepdive[i].tday,
                            hour: deepdive[i].hour,
                            time: deepdive[i].time,
                            timecard: deepdive[i].timecard,
                            clientId: deepdive[i].clientId,
                            keyCounter: deepdive[i].keyCounter,
                            mouseCounter: deepdive[i].mouseCounter,
                            appName: deepdive[i].appName,
                            windowName: deepdive[i].windowName,
                            windowUrl: deepdive[i].windowUrl,
                            screenshotUrl: deepdive[i].screenshotUrl,
                            webcamUrl: deepdive[i].webcamUrl,
                            flagged: deepdive[i].flagged,
                            status: deepdive[i].status,
                            focus: deepdive[i].focus,
                            intensityScore: deepdive[i].intensityScore
                        }
                        r1.push(r);
                    }
                    let a = groupBy(r1, 'hour');
                    rr.push(a)
                }
            }
            let startDate = dateArray[0];
            let endDate = dateArray[dateArray.length - 1];
            for (let d = 0; d < dateArray.length; d++) {
                await query(dateArray[d], userId)
            }
            if (rr.length > 0) {
                res.send({
                    startDate,
                    endDate,
                    results: rr
                })
            } else {
                res.send({
                    message: "No Results Found"
                })
            }
        } else {
            res.send({
                message: "Missing UserId"
            })
        }
    } catch (e) {
        res.send({
            message: "Error",
            e
        })
    }
})


module.exports = router;