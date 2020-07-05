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

//constants

const domain = 'localhost';
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
    } catch (e) { }
}

//Company Info

async function getCompanyInfo(companyId) {
    const cQ = `SELECT companyId,name,billingPlan,billingRate,status,timecardsize,timecardbreakupsize,enablewebcam,enablescreenshot
                FROM company
                WHERE companyId =${companyId}`;
    let cQR = await db.query(cQ);
    return cQR.results[0];
}
//UserInfo
async function getUserInfo(userId) {
    const uQ = `SELECT userId,companyId,empId,emailId,teamId,managerId,name,firstname,isManager,isActive
                FROM user
                WHERE userId =${userId}`;
    let uQR = await db.query(uQ);
    return uQR.results[0];
}
//Get Userid from Team Id

async function getUserIdfromTeam(teamId) {
    try {
        let Uid = `SELECT userId
                FROM user
                WHERE teamId =${teamId} AND isManager = 1`;
        let UidR = await db.query(Uid);
        return UidR.results;
    } catch (e) { }
}

//Get teams of the User

async function getTeams(userId) {
    try {
        let TQ = `SELECT team.teamId,team.name
            FROM team 
            WHERE managerId = ${userId}`;
        let TQR = await db.query(TQ);
        return TQR.results
    } catch (e) { }
}

//Get Array Size

function getarraysize(array) {
    return array.length
}

//Function to Generate Dropdown

async function generate_dropdown(userId, isManager) {
    try {
        let dp = [];
        if (isManager === 1) {
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
        }
        if (isManager === 0) {
            const tQ = `SELECT user.teamId,team.name
                        FROM user,team
                        WHERE user.teamId = team.teamId AND userId =${userId}`;
            let tQR = await db.query(tQ);
            for (let r of tQR.results) {
                dp.push(r)
            }
        }
        return dp;
    } catch (error) { }
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

//Function to decide OnlineStatus Based on Timestamp

async function onlineStatus(timestamp, onlineStatus) {
    timestamp = new Date();
    let current = new Date();
    const diffTime = Math.abs(current - timestamp);
    var minutes = Math.floor(diffTime / 60000);
    if (minutes > 15) {
        return onlineStatus
    } else {
        return onlineStatus
    }
}

//Query to Get All Managers
async function get_managers(teamId) {
    let results = [];
    const sql = `SELECT userId, empId, emailId, teamId, startDate, name, firstname, profilePic, profileThumbnailUrl, isManager, isActive, onlineStatus,onlineStatusTimestamp,city,message,skype,mobile  from user WHERE teamId = ${teamId} AND isManager = 1`;
    let users = await db.query(sql);
    for (let i = 0; i < users.results.length; i++) {
        onlineStatus(users.results[0].onlineStatusTimestamp);
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
            onlineStatus: await onlineStatus(users.results[i].onlineStatusTimestamp, users.results[i].onlineStatus),
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

//Query to Get All Users

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
            onlineStatus: await onlineStatus(users.results[i].onlineStatusTimestamp, users.results[i].onlineStatus),
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

//Team Summary Based On TeamId and UserId

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

//Get All teams of the 

async function get_teams(userId) {
    const sql = `SELECT teamId from team WHERE managerId =${userId}`;
    let teams = await db.query(sql);
    return teams.results;
}

//Manager Summary Based on TeamId

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

//Function to split teams

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

//Function to Convert to date to Iso

function toISOLocal(d) {
    var z = n => ('0' + n).slice(-2);
    var zz = n => ('00' + n).slice(-3);
    var off = d.getTimezoneOffset();
    var sign = off < 0 ? '+' : '-';
    off = Math.abs(off);

    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}.${zz(d.getMilliseconds())}${sign}${z(off / 60 | 0)}:${z(off % 60)}`;
}

//Function to Get the Start date of Week

function startOfWeek(date) {
    date = new Date(date);
    var diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

//Function to Get the Last date of Week

function endOfWeek(date) {
    var lastday = date.getDate() - (date.getDay() - 1) + 6;
    return new Date(date.setDate(lastday));
}

//Function to Group Json Objects basesd on Some Key

function groupBy(arr, key) {
    return (arr || []).reduce((acc, x = {}) => ({
        ...acc,
        [x[key]]: [...acc[x[key]] || [], x]
    }), {})
}

//Function to get all Team members based on teamId

async function getTeamMembers(teamId) {
    let tid;
    if (typeof (teamId) === 'object') {
        teamId.forEach(element => {
            if (typeof (tid) === 'undefined') {
                tid = element.teamId;
            } else {
                tid = `${tid},${element.teamId}`;
            }
        });
    } else {
        tid = teamId
    }

    const sql = `SELECT userId ,name 
                FROM user
                WHERE teamId IN (${tid})
                ORDER BY name ASC`;
    let sqlR = await db.query(sql);
    return sqlR.results;
}

//Date Handler

function getDates(startDate, stopDate) {
    var dateArray = new Array();
    var currentDate = startDate;
    Date.prototype.addDays = function (days) {
        var dat = new Date(this.valueOf())
        dat.setDate(dat.getDate() + days);
        return dat;
    }
    while (currentDate <= stopDate) {
        dateArray.push(toISOLocal(currentDate).split('T')[0])
        currentDate = currentDate.addDays(1);
    }
    return dateArray;
}
function focusSetter(focus, timecardbreakupsize, timecardsize) {
    if (focus * timecardbreakupsize >= timecardsize) {
        return 1
    } else {
        return 0;
    }
}
function formatTime(timeString) {
    let t = timeString[0] + timeString[1];
    if (t === '12') {
        return `${timeString} PM`;
    }
    if (t < 12) {
        return `${timeString} AM`;
    }
    if (t > 12) {
        t1 = t - 12;
        return `0${t1}:${timeString[3]}${timeString[4]} PM`;
    }

    return timeString;
}
function DT(date) {
    let nd = toISOLocal(date).split('T');
    let d = nd[0];
    let t = nd[1].slice(0, -13);
    let nt = formatTime(t)
    return `${d} ${nt}`;
}
async function WeekSummary(userId, startDate) {
    const sql = `SELECT wsId,weekNum,hoursLogged, hoursFlagged,hoursRejected,FTAR,metricsCount,focusScore, intensityScore, alignmentScore,updated FROM weeklySummary WHERE userId = ${userId} AND weekStart ='${startDate}'`;
    return (await db.query(sql)).results[0];
}

async function DailySummary(userId, Date) {
    const sql = `SELECT dsId,dayName,hoursLogged,hoursFlagged,hoursRejected,FTAR,metricsCount,focusScore,intensityScore,alignmentScore,updated FROM dailySummary WHERE userId = ${userId} AND summaryDate = '${Date}'`;
    return (await db.query(sql)).results[0];
}
//Routes
//TODO remove route during production

router.get("/", async (req, res) => {
    res.send({
        message: "Hello world"
    })
})

//Form Submission End point Support and Demo Forms

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
    const sql = `SELECT user.userId,user.companyId,user.empId,user.emailId,user.teamId,user.managerId,user.name as name,user.firstname,user.profilePic,user.profileThumbnailUrl,user.isManager,user.isActive,user.password,user.previousPassword FROM user,company WHERE user.companyId = company.companyId AND company.name='${companyname}' AND (user.empId ='${username}' or user.emailId ='${username}') AND  user.isActive =1 AND company.status='active'`;
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
            let teamId = results[0].teamId;
            let firstname = results[0].firstname;
            let profilePic = results[0].profilePic;
            let profileThumbnailUrl = results[0].profileThumbnailUrl;
            let isManager = results[0].isManager;
            let previousPassword = results[0].previousPassword;
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
                if (err) {
                    res.send({
                        message: "Error in Login"
                    })
                }
                if (result) {
                    const token = await create_token(id, '3h')
                    let dp = await generate_dropdown(id, isManager);
                    if (dp) {
                        res.cookie('CloudFront-Key-Pair-Id', cookie['CloudFront-Key-Pair-Id'], {
                            domain,
                            path: '/',
                            httpOnly: true,
                        });

                        res.cookie('CloudFront-Policy', cookie['CloudFront-Policy'], {
                            domain,
                            path: '/',
                            httpOnly: true,
                        });

                        res.cookie('CloudFront-Signature', cookie['CloudFront-Signature'], {
                            domain,
                            path: '/',
                            httpOnly: true,
                        });
                        res.send({
                            token,
                            companyId,
                            teamId,
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
                        message: "Invalid Credentials"
                    });
                }
            })
        }
    } catch (error) {
        res.send({
            message: "Error in Login",
        })
    }
})

//Validate User Token

router.post("/validate", async (req, res) => {
    let r = await validate_token(req.body.token);

    if (r) {
        res.send({
            message: r
        })
    }
})
//Logout Route to clear Cookies

router.post("/logout", async (req, res) => {
    res.clearCookie('CloudFront-Key-Pair-Id', {
        domain,
        path: '/',
        httpOnly: true,
    });
    res.clearCookie('CloudFront-Policy', {
        domain,
        path: '/',
        httpOnly: true,
    });
    res.clearCookie('CloudFront-Signature', {
        domain,
        path: '/',
        httpOnly: true,
    });
    res.send({
        message: "Cookie Cleared"
    })
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
                    message: "Error Sending Email",
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
        if (err) {
            res.send({
                message: "Error"
            });
        }
        if (result === true) {
            res.send({
                message: "You can't use the Previous Password"
            })
        } else {
            bcrypt.hash(password, 10, async function (err, hash) {
                if (err) {
                    res.send({
                        message: "Error"
                    });
                }
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
                            message: "Error Updating Password",
                        });
                    }
                }
            })
        }
    })
})

//Get all Users Based on ManagerId

router.get("/manager/:userid", auth, async (req, res) => {
    let userId = req.params.userid;
    let results = [];
    const checkquery = `SELECT teamId,managerId,isManager from user WHERE userId = ${userId}`;
    let checkResults = await db.query(checkquery);
    let teamId = checkResults.results[0].teamId;
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

//Get all Users Based on TeamId

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

//Deepdive DropDown

router.post('/deepdivedropdown', auth, async (req, res) => {
    try {
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
                    let uR = await getUserInfo(req.userId);
                    if (uR.isManager === 1) {
                        const getTeamId = `SELECT DISTINCT(teamId)
                                    FROM user   
                                    WHERE managerId = ${managerId}`;
                        let getTeamIdR = await db.query(getTeamId);
                        results = await getTeamMembers(getTeamIdR.results)
                    }
                    if (uR.isManager === 0) {
                        res.send({
                            message: "You dont have Access"
                        })
                    }
                }
                if (teamId) {
                    let uR = await getUserInfo(req.userId);
                    if (uR.isManager === 1) {
                        results = await getTeamMembers(teamId);
                    }
                    if (uR.isManager === 0) {
                        results = {
                            userId: uR.userId,
                            name: uR.name
                        }
                    }
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
    } catch (error) {
        res.send({
            message: "Error",
        })
    }
})

//Deepdive Route

router.post("/deepdive/", auth, async (req, res) => {
    try {
        let userId = req.body.userId;
        let userInfo = await getUserInfo(req.userId);
        if (userInfo.isManager === 0) {
            if (userInfo.userId != userId) {
                res.send({
                    message: "You dont have Access"
                })
            }
        }
        let companyId = userInfo.companyId;
        let companyInfo = await getCompanyInfo(companyId);
        if (companyInfo.enablewebcam === 0 && companyInfo.enablescreenshot === 0) {
            res.send({
                message: "Both Webcam and Screenshot disabled "
            })
        }
        if (userId) {
            let date;
            if (req.body.date) {
                date = new Date(req.body.date);
            } else {
                date = new Date();
            }
            var dateArray = getDates(startOfWeek(date), endOfWeek(date));
            let rr = [];
            let dailysummary = []
            async function query(date, userId) {
                let r1 = []
                const dq = `SELECT DAYNAME(timecard)as tday,HOUR(timecard) as hour,TIME(timecard) as time,timecardId,timecard,clientId,keyCounter,mouseCounter,appName,windowName,windowUrl,screenshotUrl,webcamUrl,status,focus,intensityScore FROM timecard WHERE userId=${userId} AND DATE(timecard) = '${date}'`;
                let dqr = await db.query(dq);
                if (dqr.results.length > 0) {
                    let deepdive = dqr.results;
                    let Ds = await DailySummary(userId, date);
                    dailysummary.push({
                        date: date,
                        hoursLogged: Ds.hoursLogged,
                        focusScore: Ds.focusScore,
                        intensityScore: Ds.intensityScore,
                        alignmentScore: Ds.alignmentScore,
                    })
                    for (let i = 0; i < deepdive.length; i++) {
                        if (companyInfo.enablewebcam === 1 && companyInfo.enablescreenshot === 1) {
                            let r = {
                                timecardId: deepdive[i].timecardId,
                                tday: deepdive[i].tday,
                                hour: deepdive[i].hour,
                                time: deepdive[i].time,
                                timecard: deepdive[i].timecard,
                                screenshotUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/sslib/tmb/${deepdive[i].screenshotUrl}`,
                                screenshotUrl: `${CC.CDN_URL}/${companyId}/${userId}/sslib/${deepdive[i].screenshotUrl}`,
                                webcamUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/wclib/tmb/${deepdive[i].webcamUrl}`,
                                webcamUrl: `${CC.CDN_URL}/${companyId}/${userId}/wclib/${deepdive[i].webcamUrl}`,
                                status: deepdive[i].status,
                            }
                            r1.push(r);
                        }
                        if (companyInfo.enablewebcam === 1 && companyInfo.enablescreenshot === 0) {
                            let r = {
                                timecardId: deepdive[i].timecardId,
                                tday: deepdive[i].tday,
                                hour: deepdive[i].hour,
                                time: deepdive[i].time,
                                timecard: deepdive[i].timecard,
                                webcamUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/wclib/tmb/${deepdive[i].webcamUrl}`,
                                webcamUrl: `${CC.CDN_URL}/${companyId}/${userId}/wclib/${deepdive[i].webcamUrl}`,
                                status: deepdive[i].status,
                            }
                            r1.push(r);
                        }
                        if (companyInfo.enablewebcam === 0 && companyInfo.enablescreenshot === 1) {
                            let r = {
                                timecardId: deepdive[i].timecardId,
                                tday: deepdive[i].tday,
                                hour: deepdive[i].hour,
                                time: deepdive[i].time,
                                timecard: deepdive[i].timecard,
                                screenshotUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/sslib/tmb/${deepdive[i].screenshotUrl}`,
                                screenshotUrl: `${CC.CDN_URL}/${companyId}/${userId}/sslib/${deepdive[i].screenshotUrl}`,
                                status: deepdive[i].status,
                            }
                            r1.push(r);
                        }
                    }
                    let a = groupBy(r1, 'hour');
                    rr.push(a);
                }
            }
            let startDate = dateArray[0];
            let endDate = dateArray[dateArray.length - 1];
            for (let d = 0; d < dateArray.length; d++) {
                await query(dateArray[d], userId)
            }
            let wS = await WeekSummary(userId, startDate);
            if (rr.length > 0) {
                res.send({
                    startDate,
                    endDate,
                    hoursLogged: wS.hoursLogged,
                    focusScore: wS.focusScore,
                    intensityScore: wS.focusScore,
                    alignmentScore: wS.alignmentScore,
                    dailysummary,
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
        })
    }
})

//Timecard Breakup data from timecardId

router.post("/breakup/:timecard", auth, async (req, res) => {
    try {
        let timecardId = req.params.timecard;
        let userInfo = await getUserInfo(req.userId);
        let comapanyInfo = await getCompanyInfo(userInfo.companyId);
        if (timecardId) {
            //Get all timecard data
            const tQ = `SELECT YEAR(timecard) as timecardYear,MONTH(timecard) as timecardMonth,DAY(timecard)as timecardDay,HOUR(timecard) as timecardHour,MINUTE(timecard) as timecardMinute,timecard,userId,focus,intensityScore
            FROM timecard 
            WHERE timecardId = ${timecardId}`;
            let tQR = await db.query(tQ);
            let timecardYear = tQR.results[0].timecardYear;
            let timecardMonth = tQR.results[0].timecardMonth;
            let timecardDay = tQR.results[0].timecardDay;
            let timecardHour = tQR.results[0].timecardHour;
            let timecardMinute = tQR.results[0].timecardMinute;
            let userId = tQR.results[0].userId;
            let focus = tQR.results[0].focus;
            let intensityScore = tQR.results[0].intensityScore;
            //Querying from Timecard Breakup table

            const tBQ = `SELECT timecardBreakupId,timeCardBreakup,userId,clientId,screenshotUrl,webcamUrl,managerComment,commentShared 
            FROM timecardBreakup WHERE userId = ${userId} AND YEAR(timeCardBreakup) = ${timecardYear} AND MONTH(timeCardBreakup) = ${timecardMonth} AND DAY(timeCardBreakup) = ${timecardDay} AND HOUR(timeCardBreakup) = ${timecardHour} AND MINUTE(timeCardBreakup) BETWEEN ${timecardMinute} AND ${timecardMinute + comapanyInfo.timecardsize} ORDER BY timeCardBreakup ASC`;
            let tBQR = await db.query(tBQ);
            let tB = tBQR.results;
            let rr = [];
            for (let i = 0; i < tB.length; i++) {
                let r = {
                    timecardId: timecardId,
                    timecardBreakupId: tB[i].timecardBreakupId,
                    Datetime: DT(tB[i].timeCardBreakup),
                    screenshotUrl: `${CC.CDN_URL}/${userInfo.companyId}/${userId}/sslib/${tB[i].screenshotUrl}`,
                    webcamUrl: `${CC.CDN_URL}/${userInfo.companyId}/${userId}/wclib/${tB[i].webcamUrl}`,
                    managerComment: tB[i].managerComment,
                }
                rr.push(r)
            }
            res.send({
                focus: focusSetter(focus, comapanyInfo.timecardbreakupsize, comapanyInfo.timecardsize),
                intensityScore,
                results: rr
            })
        } else {
            res.send({
                message: "Missing TimecardId"
            })
        }
    } catch (error) {
        res.send({
            message: Error,
        })
    }
})

//Details Route

router.post("/details", auth, async (req, res) => {
    try {
        let userId = req.body.userId;
        let userInfo = await getUserInfo(req.userId);
        if (userInfo.isManager === 0) {
            if (userInfo.userId != userId) {
                res.send({
                    message: "You dont have Access"
                })
            }
        }
        let companyId = req.body.companyId;
        if (companyId) {
            let companyInfo = await getCompanyInfo(companyId);
            if (companyInfo.enablewebcam === 0 && companyInfo.enablescreenshot === 0) {
                res.send({
                    message: "Both Webcam and Screenshot disabled "
                })
            }
            if (userId) {
                let date;
                if (req.body.date) {
                    date = new Date(req.body.date);
                } else {
                    date = new Date();
                }
                var dateArray = getDates(startOfWeek(date), endOfWeek(date));
                let rr = [];
                async function query(date, userId) {
                    let r1 = []
                    const dq = `SELECT DAYNAME(timeCardBreakup)as tday,HOUR(timeCardBreakup) as hour,TIME(timeCardBreakup) as time,timecardBreakupId,timecardId,timeCardBreakup,clientId,keyCounter,mouseCounter,appName,windowName,windowUrl,screenshotUrl,webcamUrl,managerComment,commentShared FROM  timecardBreakup WHERE userId=${userId} AND DATE(timeCardBreakup) = '${date}' ORDER BY time`;
                    let dqr = await db.query(dq);
                    if (dqr.results.length > 0) {
                        let deepdive = dqr.results;
                        for (let i = 0; i < deepdive.length; i++) {
                            if (companyInfo.enablewebcam === 1 && companyInfo.enablescreenshot === 1) {
                                let r = {
                                    timecardBreakupId: deepdive[i].timecardBreakupId,
                                    timecardId: deepdive[i].timecardId,
                                    tday: deepdive[i].tday,
                                    hour: deepdive[i].hour,
                                    time: deepdive[i].time,
                                    timeCardBreakup: deepdive[i].timeCardBreakup,
                                    screenshotUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/sslib/tmb/${deepdive[i].screenshotUrl}`,
                                    screenshotUrl: `${CC.CDN_URL}/${companyId}/${userId}/sslib/${deepdive[i].screenshotUrl}`,
                                    webcamUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/wclib/tmb/${deepdive[i].webcamUrl}`,
                                    webcamUrl: `${CC.CDN_URL}/${companyId}/${userId}/wclib/${deepdive[i].webcamUrl}`,
                                    managerComment: deepdive[i].managerComment,
                                    commentShared: deepdive[i].commentShared,
                                }
                                r1.push(r);
                            }
                            if (companyInfo.enablewebcam === 1 && companyInfo.enablescreenshot === 0) {
                                let r = {
                                    timecardBreakupId: deepdive[i].timecardBreakupId,
                                    timecardId: deepdive[i].timecardId,
                                    tday: deepdive[i].tday,
                                    hour: deepdive[i].hour,
                                    time: deepdive[i].time,
                                    timeCardBreakup: deepdive[i].timeCardBreakup,
                                    webcamUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/wclib/tmb/${deepdive[i].webcamUrl}`,
                                    webcamUrl: `${CC.CDN_URL}/${companyId}/${userId}/wclib/${deepdive[i].webcamUrl}`,
                                    managerComment: deepdive[i].managerComment,
                                    commentShared: deepdive[i].commentShared,
                                }
                                r1.push(r);
                            }
                            if (companyInfo.enablewebcam === 0 && companyInfo.enablescreenshot === 1) {
                                let r = {
                                    timecardBreakupId: deepdive[i].timecardBreakupId,
                                    timecardId: deepdive[i].timecardId,
                                    tday: deepdive[i].tday,
                                    hour: deepdive[i].hour,
                                    time: deepdive[i].time,
                                    timeCardBreakup: deepdive[i].timeCardBreakup,
                                    screenshotUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/sslib/tmb/${deepdive[i].screenshotUrl}`,
                                    screenshotUrl: `${CC.CDN_URL}/${companyId}/${userId}/sslib/${deepdive[i].screenshotUrl}`,
                                    managerComment: deepdive[i].managerComment,
                                    commentShared: deepdive[i].commentShared,
                                }
                                r1.push(r);
                            }
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
        } else {
            res.send({
                message: "Missing Company Id"
            })
        }
    } catch (error) {
        res.send({
            message: "Error",
        })
    }
})

//Flagging Timecard

router.post("/flag/:timecard", auth, async (req, res) => {
    try {
        let userInfo = await getUserInfo(req.userId);
        let timecardId = req.params.timecard;
        if (timecardId) {
            if (userInfo.isManager === 1) {
                const FlagQuery = `UPDATE timecard set status='flagged' WHERE timecardId=${timecardId}`;
                let FlagQueryR = await db.query(FlagQuery);
                if (FlagQueryR.results.affectedRows === 1) {
                    res.send({
                        message: "Successfully Flagged"
                    })
                } else {
                    res.send({
                        message: "Timecard with the specified ID Not Found"
                    })
                }
            } else {
                res.send({
                    message: "You don't have access to flag timecard"
                })
            }
        } else {
            res.send({
                message: "No timecard specified to Flag"
            })
        }
    } catch (error) {
        res.send({
            message: "Error",
        })
    }
})

router.post("/comment/:id", auth, async (req, res) => {
    try {
        let timecardBreakupId = req.params.id;
        let userInfo = await getUserInfo(req.userId);
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var dateTime = date + ' ' + time;
        if (timecardBreakupId) {
            let comment = req.body.comment;
            if (comment) {
                const sql = `SELECT managerComment
                            FROM timecardBreakup
                            WHERE timecardBreakupId = ${timecardBreakupId}`;
                let sqlR = await db.query(sql);
                if (sqlR.results.length > 0) {
                    let managerComment = sqlR.results[0].managerComment;
                    let mc = JSON.parse(managerComment) || [];
                    mc.push({
                        dateTime,
                        from: userInfo.name,
                        message: comment
                    })
                    const IQ = `UPDATE timecardBreakup
                        SET managerComment = '${JSON.stringify(mc)}'
                        WHERE timecardBreakupId=${timecardBreakupId}`;
                    let IQR = await db.query(IQ);
                    if (IQR.results.affectedRows > 0) {
                        res.send({
                            message: "Comment Sent"
                        })
                    } else {
                        res.send({
                            message: "Error During Updating Comment"
                        })
                    }
                } else {
                    res.send({
                        message: "Wrong timecardBreakupId"
                    })
                }
            } else {
                res.send({
                    message: "Missing Data"
                })
            }
        } else {
            res.send({
                message: "No timecardBreakupId Specified"
            })
        }
    } catch (error) {
        res.send({
            message: "Error",
        })
    }
})

router.get("/comment/:id", auth, async (req, res) => {
    try {
        let timecardBreakupId = req.params.id;
        if (timecardBreakupId) {
            const sql = `SELECT managerComment
                            FROM timecardBreakup
                            WHERE timecardBreakupId = ${timecardBreakupId}`;
            let sqlR = await db.query(sql);
            if (sqlR.results.length > 0) {
                res.send({
                    message: JSON.parse(sqlR.results[0].managerComment)
                })
            } else {
                res.send({
                    message: "Wrong timecardBreakupId"
                })
            }
        } else {
            res.send({
                message: "No timecardBreakupId Specified"
            })
        }

    } catch (error) {
        res.send({
            message: "Error"
        })
    }
})

// Ram: This API is required outside of SaaS app.
// Todo: this requires updation every time there is a change in /login authenticaiton logic
router.post("/cServerAuth", async (req, res) => {
    let companyname = req.body.companyname;
    let username = req.body.username;
    let password = req.body.password;
    const sql = `SELECT user.userId,user.name as name,user.password,
    company.companyId, company.timecardsize, company.timecardbreakupsize, company.enablewebcam, company.enablescreenshot
    FROM user,company WHERE user.companyId = company.companyId
    AND company.name= ?
    AND (user.empId = ? or user.emailId = ?)
    AND user.isActive = 1
    AND company.status = "active"`;
    try {
        let {
            results
        } = await db.query(sql, [companyname, username, username]);
        if (Object.keys(results).length === 0) {
            res.send({
                "auth": 0,
                message: "No user."
            });
        } else {
            let haspass = results[0].password;
            bcrypt.compare(password, haspass, async function (err, result) {
                if (result) {
                    res.send({
                        "auth": 1,
                        "userId": results[0].userId,
                        "userName": results[0].name,
                        "companyId": results[0].companyId,
                        "tcSize": results[0].timecardsize,
                        "tcbSize": results[0].timecardbreakupsize,
                        "webcam": results[0].enablewebcam,
                        "screenshot": results[0].enablescreenshot
                    })
                } else {
                    res.send({
                        "auth": 0,
                        message: "Invalid credentials."
                    })
                }
            });
        }
    } catch (error) {
        res.send({
            "auth": 0,
            message: error
        });
    }
});

module.exports = router;