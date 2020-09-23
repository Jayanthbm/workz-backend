const express = require("express");
const db = require("../models/db");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const CC = require("../constants");
const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");

//Middlewares
const auth = require("../middlewares/auth");

//AWS
const cloudFront = new AWS.CloudFront.Signer(CC.cfpublickey, CC.cfprivateKey);

//constants

const domain = "localhost";
//Functions

//Get Name from UserId

async function getManagerName(userId) {
  try {
    let m = [];
    let MN = `SELECT userId,name
            FROM user
            WHERE userId  =${userId}`;
    let MNR = await db.query(MN);
    let n = await getTeams(userId);
    if (n.length > 1) {
      m.push({
        userId: userId,
        name: MNR.results[0].name + "'s Teams",
      });
    } else {
      m.push({
        userId: userId,
        name: MNR.results[0].name + "'s Team",
      });
    }

    return m[0];
  } catch (e) {}
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
  } catch (e) {}
}

//Get teams of the User

async function getTeams(userId) {
  try {
    let TQ = `SELECT team.teamId,team.name
            FROM team
            WHERE managerId = ${userId}`;
    let TQR = await db.query(TQ);
    return TQR.results;
  } catch (e) {}
}

//Get Array Size

function getarraysize(array) {
  return array.length;
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
      dp.push(MQR.results[0]);
      await a(userId);
      //get the teams of user
      async function a(userId) {
        let T = await getTeams(userId);
        let mn = await getManagerName(userId);
        dp[getarraysize(dp)] = mn;
        dp[getarraysize(dp) - 1]["teams"] = T;
        for (let i = 0; i < T.length; i++) {
          let uid = await getUserIdfromTeam(T[i].teamId);
          if (uid) {
            for (let j = 0; j < uid.length; j++) {
              await a(uid[j].userId);
            }
          } else {
            return;
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
        dp.push(r);
      }
    }
    return dp;
  } catch (error) {}
}

//Function to Create Token

async function create_token(id, expiresIn) {
  const token = jwt.sign(
    {
      userId: id,
    },
    CC.SECRET_KEY,
    {
      expiresIn,
    }
  );
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
  });
  return r;
}

//Function to decide OnlineStatus Based on Timestamp

async function onlineStatus(timestamp, onlineStatus) {
  timestamp = new Date();
  let current = new Date();
  const diffTime = Math.abs(current - timestamp);
  var minutes = Math.floor(diffTime / 60000);
  if (minutes > 15) {
    return onlineStatus;
  } else {
    return onlineStatus;
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
      onlineStatus: await onlineStatus(
        users.results[i].onlineStatusTimestamp,
        users.results[i].onlineStatus
      ),
      onlineStatusTimestamp: users.results[i].onlineStatusTimestamp,
      city: users.results[i].city,
      message: users.results[i].message,
      skype: users.results[i].skype,
      mobile: users.results[i].mobile,
    };
    results.push(r);
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
      onlineStatus: await onlineStatus(
        users.results[i].onlineStatusTimestamp,
        users.results[i].onlineStatus
      ),
      onlineStatusTimestamp: users.results[i].onlineStatusTimestamp,
      city: users.results[i].city,
      message: users.results[i].message,
      skype: users.results[i].skype,
      mobile: users.results[i].mobile,
    };
    results.push(r);
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
    total_employees: te,
    active: ta,
    inactive: ti,
    offline: to,
  };
  return teamSummary;
}

//Get All teams of the

async function get_teams(userId) {
  const sql = `SELECT teamId from team WHERE managerId =${userId}`;
  let teams = await db.query(sql);
  return teams.results;
}

//Manager Summary Based on TeamId

async function manager_summary(teamId) {
  let ma = [];
  let ms = [];
  const sql = `SELECT userId from user WHERE teamId = ${teamId} AND isManager = 1`;
  let managerId = await db.query(sql);
  ma.push(managerId.results);
  if (ma[0].length > 1) {
    for (let i = 0; i < ma[0].length; i++) {
      let teams = await get_teams(ma[0][i].userId);
      for (let j = 0; j < teams.length; j++) {
        let ts = await team_summary(teams[j].teamId, ma[0][i].userId);
        ms.push(ts);
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
    result.add(r[a.userId]);
    return r;
  }, Object.create(null));
  return Array.from(result);
}

//Function to Convert to date to Iso

function toISOLocal(d) {
  var z = (n) => ("0" + n).slice(-2);
  var zz = (n) => ("00" + n).slice(-3);
  var off = d.getTimezoneOffset();
  var sign = off < 0 ? "+" : "-";
  off = Math.abs(off);

  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(
    d.getHours()
  )}:${z(d.getMinutes())}:${z(d.getSeconds())}.${zz(
    d.getMilliseconds()
  )}${sign}${z((off / 60) | 0)}:${z(off % 60)}`;
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
  return (arr || []).reduce(
    (acc, x = {}) => ({
      ...acc,
      [x[key]]: [...(acc[x[key]] || []), x],
    }),
    {}
  );
}

//Function to get all Team members based on teamId

async function getTeamMembers(teamId) {
  let tid;
  if (typeof teamId === "object") {
    teamId.forEach((element) => {
      if (typeof tid === "undefined") {
        tid = element.teamId;
      } else {
        tid = `${tid},${element.teamId}`;
      }
    });
  } else {
    tid = teamId;
  }

  const sql = `SELECT userId ,name,isManager
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
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
  };
  while (currentDate <= stopDate) {
    dateArray.push(toISOLocal(currentDate).split("T")[0]);
    currentDate = currentDate.addDays(1);
  }
  return dateArray;
}

function focusSetter(focus, timecardbreakupsize, timecardsize) {
  if (focus * timecardbreakupsize >= timecardsize) {
    return 1;
  } else {
    return 0;
  }
}

function formatTime(timeString) {
  let t = timeString[0] + timeString[1];
  if (t === "12") {
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
  let nd = toISOLocal(date).split("T");
  let d = nd[0];
  let t = nd[1].slice(0, -13);
  let nt = formatTime(t);
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

function prevnext(array, timecardId) {
  let index = 0;
  let pTiD = 0;
  let nTiD = 0;
  if (array.length > 1) {
    for (let i = 0; i < array.length; i++) {
      if (array[i].timecardId == timecardId) {
        index = i;
      }
    }
    if (index === 0) {
      pTiD = array[array.length - 1].timecardId;
      nTiD = array[index + 1].timecardId;
    } else {
      if (index === array.length - 1) {
        pTiD = array[index - 1].timecardId;
        nTiD = array[0].timecardId;
      } else {
        pTiD = array[index - 1].timecardId;
        nTiD = array[index + 1].timecardId;
      }
    }
  } else {
    pTiD = timecardId;
    nTiD = timecardId;
  }
  return {
    pTiD,
    nTiD,
  };
}

async function getTimecardId(timecardBreakupId) {
  const tbQ = `SELECT userId,YEAR(timeCardBreakup) as year, MONTH(timeCardBreakup) as month, DAY(timeCardBreakup) as day, HOUR(timeCardBreakup) as hour,MINUTE(timeCardBreakup) as minute FROM timecardBreakup WHERE timecardBreakupId = ${timecardBreakupId}`;
  let tbQR = await db.query(tbQ);
  let userId = tbQR.results[0].userId;
  let year = tbQR.results[0].year;
  let month = tbQR.results[0].month;
  let day = tbQR.results[0].day;
  let hour = tbQR.results[0].hour;
  let minute = tbQR.results[0].minute;
  if (minute >= 0 && minute < 10) {
    minute = 0;
  }
  if (minute >= 10 && minute < 20) {
    minute = 10;
  }
  if (minute >= 20 && minute < 30) {
    minute = 20;
  }
  if (minute >= 30 && minute < 40) {
    minute = 30;
  }
  if (minute >= 40 && minute < 50) {
    minute = 40;
  }
  if (minute >= 50 && minute < 60) {
    minute = 50;
  }

  const tQ = `SELECT timecardId
                FROM timecard
                WHERE userId = ${userId} AND YEAR(timecard) = ${year} AND MONTH(timecard) = ${month}  AND DAY(timecard) = ${day} AND HOUR(timecard) = ${hour} AND MINUTE(timecard) = ${minute}`;
  const tQR = await db.query(tQ);
  if (tQR) {
    return tQR.results[0].timecardId;
  }
}

function responseSender(res, message) {
  res.send({
    message: message,
  });
}

async function checkAccess(authId, isManager, requestedId) {
  if (isManager === 0) {
    return authId == requestedId ? true : false;
  }
  if (isManager === 1) {
    //Get all team
    let access = false;
    let memberIds = [];
    memberIds.push(authId);
    let teams = await get_teams(authId);
    for (let i = 0; i < teams.length; i++) {
      let members = await getTeamMembers(teams[i].teamId);
      for (let j = 0; j < members.length; j++) {
        memberIds.push(members[j].userId);
      }
    }
    for (let m = 0; m < memberIds.length; m++) {
      if (memberIds[m] == requestedId) {
        access = true;
      }
    }
    return access;
  }
}

//Function to Check TImecard Status
async function checkTimecardStatus(timecardId) {
  let fQ = `SELECT status
            FROM timecard
            WHERE timecardId=${timecardId}`;
  let fQr = await db.query(fQ);
  return fQr.results[0].status;
}

//Function to Update Timecard Status
async function updateTImecardStatus(timecardId, status) {
  let FlagQuery = `UPDATE timecard set status='${status}'
                    WHERE timecardId=${timecardId}`;
  let FlagQueryR = await db.query(FlagQuery);
  return FlagQueryR.results.affectedRows === 1 ? true : false;
}

function formatHoursLogged(hours) {
  let h = Math.floor(hours);
  let m = (hours - Math.floor(h)) * 60;
  return m > 0 ? `${h} Hours ${Math.floor(m)} min` : `${h}hours`;
}

async function getMemberIds(userId, type) {
  let userInfo = await getUserInfo(userId);
  let memberIds = [];
  if (userInfo.isManager === 1) {
    if (type === "Direct") {
      let teamIds = await getTeams(userId);
      for (let i = 0; i < teamIds.length; i++) {
        let members = await getTeamMembers(teamIds[i].teamId);
        for (j = 0; j < members.length; j++) {
          memberIds.push(members[j].userId);
        }
      }
    }
    if (type === "Full") {
      let teamIds = await getTeams(userId);
      for (let i = 0; i < teamIds.length; i++) {
        let members = await getTeamMembers(teamIds[i].teamId);
        for (j = 0; j < members.length; j++) {
          if (members[j].isManager === 1) {
            let t = await getTeams(members[j].userId);
            for (k = 0; k < t.length; k++) {
              let m = await getTeamMembers(t[i].teamId);
              for (let l = 0; l < m.length; l++) {
                memberIds.push(m[l].userId);
              }
            }
          } else {
            memberIds.push(members[j].userId);
          }
        }
      }
    }
    return memberIds;
  } else {
    return null;
  }
}

//Function to Update Daily Summary
async function updateDailySummary(userId, summaryDate, status) {
  let upadteDailySummaryQuery;
  if (status === "approved") {
    upadteDailySummaryQuery = `UPDATE dailySummary set hoursLogged =TRUNCATE((((hoursLogged*60)+10)/60),2),hoursFlagged=TRUNCATE((((hoursFlagged*60)-10)/60),2)
		WHERE userId= ${userId} AND summaryDate ='${summaryDate}' `;
  }
  if (status === "rejected") {
    upadteDailySummaryQuery = `UPDATE dailySummary set hoursFlagged=TRUNCATE((((hoursFlagged*60)-10)/60),2),hoursRejected=TRUNCATE((((hoursRejected*60)+10)/60),2)
		WHERE userId= ${userId} AND summaryDate ='${summaryDate}' `;
  }
  let upadteDailySummaryQueryR = await db.query(upadteDailySummaryQuery);
  return upadteDailySummaryQueryR.results.affectedRows === 1 ? true : false;
}

//Function to get Timecard Details
async function getTimecardDetails(timecardId) {
  const sql = `SELECT timecard,userId,DATE(timecard) as Dtimecard
              FROM timecard
              WHERE timecardId = ${timecardId}`;
  let sqlR = await db.query(sql);
  return sqlR.results[0];
}
async function checkDuplicatetimecardDisputes(timecardId, userId) {
  let dQ = `SELECT timecardId,userId
            FROM timecardDisputes
            WHERE timecardId=${timecardId} AND userId=${userId} AND status='open'`;
  let dQR = await db.query(dQ);
  if (dQR.results.length > 0) {
    return 0;
  } else {
    return 1;
  }
}
async function timecardDisputesHandler(method, timecardId, data) {
  if (timecardId) {
    if (method === "add") {
      if (checkDuplicatetimecardDisputes(timecardId, data.userId) === 1) {
        console.log("Inserting Record");
        let itQ = `INSERT INTO timecardDisputes (timecardId,userId,disputeReason,status)VALUES(${timecardId},${data.userId},'${data.disputeReason}','${data.status}')`;
        let itQR = await db.query(itQ);
        return itQR.results.affectedRows === 1 ? true : false;
      } else {
        console.log("Record Exist");
      }
    }
    if (method === "update") {
      let utQ = `UPDATE timecardDisputes SET approverComments = '${data.approverComments}' ,status= '${data.status}' WHERE timecardId = ${timecardId}`;
      if (updateTImecardStatus(timecardId, data.status)) {
        let timecardDetails = await getTimecardDetails(timecardId);
        if (
          updateDailySummary(
            timecardDetails.userId,
            timecardDetails.Dtimecard,
            data.status
          )
        ) {
          let utQR = await db.query(utQ);
          return utQR.results.affectedRows === 1 ? true : false;
        }
      }
      return false;
    }
  } else {
    return null;
  }
}
async function manualTimecardHandler(method, userId, data) {
  if (userId) {
    if (method === "add") {
      let imQ = `INSERT INTO manualTime(userId,startTime,endTime,manualTimeReason,status)VALUES(${userId},'${data.startTime}','${data.endTime}','${data.reason}','${data.status}')`;
      let imQR = await db.query(imQ);
      return imQR.results.affectedRows === 1 ? true : false;
    }
    if (method === "update") {
      let umQ = `UPDATE manualTime SET approverComments = '${data.approverComments}' ,status= '${data.status}' WHERE manualTimeId = ${data.manualTimeId}`;
      let umQR = await db.query(umQ);
      return umQR.results.affectedRows === 1 ? true : false;
    }
  } else {
    return null;
  }
}
//Routes
//TODO remove route during production

router.get("/", async (req, res) => {
  responseSender(res, `Hello world`);
});

//Form Submission End point Support and Demo Forms

router.post("/submitform", async (req, res) => {
  try {
    let name = req.body.name;
    let companyName = req.body.companyName;
    let phone = req.body.phone;
    let email = req.body.email;
    let description = req.body.description;
    let typeRequest = req.body.typeRequest;
    if (!(typeRequest === "Demo" || typeRequest === "Support")) {
      responseSender(res, `Missing Data`);
    } else {
      let fI = `INSERT INTO queryForms(name,companyName,phone,email,description,typeRequest)VALUES('${name}','${companyName}','${phone}','${email}','${description}','${typeRequest}') `;
      let fIr = await db.query(fI);
      fIr.results.affectedRows === 1 && fIr.results.warningCount === 0
        ? responseSender(res, `Form Submitted Successfully`)
        : responseSender(res, `Error Submiting Form`);
    }
  } catch (error) {
    responseSender(res, error);
  }
});

//Login Route

router.post("/login", async (req, res) => {
  try {
    let companyname = req.body.companyname;
    let username = req.body.username;
    let password = req.body.password;
    if (!companyname && !username && !password) {
      responseSender(res, `Invalid Credentials`);
    } else {
      let loginQuery = `SELECT user.userId,user.companyId,user.empId,user.emailId,user.teamId,user.managerId,user.name as name,user.firstname,user.profilePic,user.profileThumbnailUrl,user.isManager,user.isActive,user.password,user.previousPassword FROM user,company WHERE user.companyId = company.companyId AND company.name='${companyname}' AND (user.empId ='${username}' or user.emailId ='${username}') AND  user.isActive =1 AND company.status='active'`;
      let loginResults = await db.query(loginQuery);
      let results = loginResults.results;
      if (results.length < 1) {
        responseSender(res, `Invalid Credentials`);
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
        bcrypt.compare(password, haspass, async function (err, result) {
          if (err) {
            responseSender(res, `Error in Login`);
          } else {
            const policy = JSON.stringify({
              Statement: [
                {
                  Resource: CC.cfurl + companyId + "/*",
                  Condition: {
                    DateLessThan: {
                      "AWS:EpochTime":
                        Math.floor(new Date().getTime() / 1000) +
                        60 * CC.cookieexpiry, // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
                    },
                  },
                },
              ],
            });
            const cookie = cloudFront.getSignedCookie({
              policy,
            });
            const token = await create_token(id, "3h");
            let dp = await generate_dropdown(id, isManager);
            if (dp) {
              res.cookie(
                "CloudFront-Key-Pair-Id",
                cookie["CloudFront-Key-Pair-Id"],
                {
                  domain,
                  path: "/",
                  httpOnly: true,
                }
              );

              res.cookie("CloudFront-Policy", cookie["CloudFront-Policy"], {
                domain,
                path: "/",
                httpOnly: true,
              });

              res.cookie(
                "CloudFront-Signature",
                cookie["CloudFront-Signature"],
                {
                  domain,
                  path: "/",
                  httpOnly: true,
                }
              );
              res.send({
                token,
                companyId,
                teamId,
                userId: id,
                isManager,
                dropdown: dp,
                email,
                firstname,
                profilePic,
                profileThumbnailUrl,
                previousPassword,
              });
            }
          }
        });
      }
    }
  } catch (error) {
    responseSender(res, `Invalid Credentials`);
  }
});

//Validate User Token

router.post("/validate", async (req, res) => {
  try {
    let r = await validate_token(req.body.token);

    if (r) {
      responseSender(res, r);
    }
  } catch (error) {
    responseSender(res, error);
  }
});

//Refresh token route

router.post("/refresh", auth, async (req, res) => {
  let userInfo = await getUserInfo(req.userId);
  let compnayId = userInfo.companyId;
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: CC.cfurl + compnayId + "/*",
        Condition: {
          DateLessThan: {
            "AWS:EpochTime":
              Math.floor(new Date().getTime() / 1000) + 60 * CC.cookieexpiry, // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
          },
        },
      },
    ],
  });
  const cookie = cloudFront.getSignedCookie({
    policy,
  });
  const token = await create_token(req.userId, "3h");
  res.cookie("CloudFront-Key-Pair-Id", cookie["CloudFront-Key-Pair-Id"], {
    domain,
    path: "/",
    httpOnly: true,
  });

  res.cookie("CloudFront-Policy", cookie["CloudFront-Policy"], {
    domain,
    path: "/",
    httpOnly: true,
  });

  res.cookie("CloudFront-Signature", cookie["CloudFront-Signature"], {
    domain,
    path: "/",
    httpOnly: true,
  });
  res.send({
    newToken: token,
  });
});
//Logout Route to clear Cookies

router.post("/logout", async (req, res) => {
  try {
    res.clearCookie("CloudFront-Key-Pair-Id", {
      domain,
      path: "/",
      httpOnly: true,
    });
    res.clearCookie("CloudFront-Policy", {
      domain,
      path: "/",
      httpOnly: true,
    });
    res.clearCookie("CloudFront-Signature", {
      domain,
      path: "/",
      httpOnly: true,
    });
    responseSender(res, `Cookie Cleared`);
  } catch (error) {
    responseSender(res, error);
  }
});

//Forgot Password Route

router.post("/forgotpass", async (req, res) => {
  try {
    let username = req.body.username;
    if (!username) {
      responseSender(res, `No User Found`);
    } else {
      let userQuery = `SELECT userId,empId,emailId FROM user WHERE empId = '${username}' or emailId= '${username}'`;
      if (userQuery.results.length < 1) {
        responseSender(res, `No User Found`);
      } else {
        let id = userQuery.results[0].userId;
        let emailId = userQuery.results[0].emailId;
        if (id) {
          const token = await create_token(id, "3h");
          let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "jayanth.m1995@gmail.com",
              pass: "i@143magge",
            },
          });
          let info = await transporter.sendMail({
            from: "jayanth.m1995@gmail.com",
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
                                </div>`, // html body
          });
          if (info["accepted"].length > 0) {
            responseSender(res, `Email Sent to registered Address`);
          } else {
            responseSender(res, `Error Sending Email`);
          }
        }
      }
    }
  } catch (error) {
    responseSender(res, error);
  }
});

//Update Pass route

router.post("/updatepass", auth, async (req, res) => {
  try {
    let userId = req.userId;
    let password = req.body.password;
    let oldPass;
    if (!userId) {
      responseSender(res, `No User Found`);
    } else {
      let passQuery = `SELECT password from user where userId =${userId}`;
      let passQueryResults = await db.query(passQuery);
      passQueryResults.results.length < 1
        ? responseSender(res, `No User Found`)
        : (oldPass = passQueryResults.results[0].password);
      bcrypt.compare(password, oldPass, function (err, result) {
        if (err) {
          responseSender(res, `Error`);
        }

        result === true
          ? responseSender(res, `You can't use the Previous Password`)
          : bcrypt.hash(password, 10, async function (err, hash) {
              if (err) {
                responseSender(res, `Error`);
              }
              if (hash) {
                let updateQuery = `UPDATE user set password = '${hash}',previousPassword='${oldPass}' where userId =${userId} `;
                let uR = await db.query(updateQuery);
                uR.results
                  ? responseSender(res, `Password Updated Succesfully`)
                  : responseSender(res, `Error Updating Password`);
              }
            });
      });
    }
  } catch (error) {
    responseSender(res, error);
  }
});

//Get all Users Based on ManagerId

router.get("/manager/:userid", auth, async (req, res) => {
  try {
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
        let r = [];
        results[0][i].managers = [];
        let managers = await get_managers(mainteams[i].teamId);
        for (let j = 0; j < managers.length; j++) {
          r.push([managers[j]]);
        }
        let managersummary = await manager_summary(mainteams[i].teamId);
        let rr = teams_splitter(managersummary);
        for (let k = 0; k < rr.length; k++) {
          r[k].push(rr[k]);
        }
        results[0][i].managers = r;
        let users = await get_users(mainteams[i].teamId);
        results[0][i].users = users;
      }
      results = results[0];
      res.send({
        results,
      });
    } else {
      const teamquery = `SELECT teamId,name from team WHERE teamId = ${teamId}`;
      let teamqueryResults = await db.query(teamquery);
      results.push(teamqueryResults.results[0]);
      let r = [];
      results[0].managers = [];
      let managers = await get_managers(teamqueryResults.results[0].teamId);
      for (let j = 0; j < managers.length; j++) {
        r.push([managers[j]]);
      }
      results[0].managers = r;
      let users = await get_users(teamqueryResults.results[0].teamId);
      results[0].users = users;
      res.send({
        results,
      });
    }
  } catch (error) {
    responseSender(res, error);
  }
});

//Get all Users Based on TeamId

router.get("/teams/:teamid", auth, async (req, res) => {
  try {
    let results = [];
    let teamId = req.params.teamid;
    let teamquery = `SELECT teamId,name from team WHERE teamId = ${teamId}`;
    let teamqueryResults = await db.query(teamquery);
    results.push(teamqueryResults.results[0]);
    let r = [];
    results[0].managers = [];
    let managers = await get_managers(teamId);
    for (let j = 0; j < managers.length; j++) {
      r.push([managers[j]]);
    }
    let managersummary = await manager_summary(teamId);
    let rr = teams_splitter(managersummary);
    for (let k = 0; k < rr.length; k++) {
      r[k].push(rr[k]);
    }
    results[0].managers = r;
    let users = await get_users(teamId);
    results[0].users = users;
    res.send({
      results,
    });
  } catch (error) {
    responseSender(res, error);
  }
});

//Deepdive DropDown

router.post("/deepdivedropdown", auth, async (req, res) => {
  try {
    let results;
    let managerId = req.body.managerId;
    let teamId = req.body.teamId;
    if (managerId || teamId) {
      if (managerId && teamId) {
        responseSender(res, `Both ManagerId and Teamid Passed`);
      } else {
        if (managerId) {
          let uR = await getUserInfo(req.userId);
          if (uR.isManager === 0) {
            responseSender(res, `You dont have Access`);
          } else {
            const getTeamId = `SELECT DISTINCT(teamId)
                                    FROM user
                                    WHERE managerId = ${managerId}`;
            let getTeamIdR = await db.query(getTeamId);
            results = await getTeamMembers(getTeamIdR.results);
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
              name: uR.name,
            };
          }
        }
        if (results) {
          res.send(results);
        }
      }
    } else {
      responseSender(res, `Missing Fields`);
    }
  } catch (error) {
    responseSender(res, error);
  }
});

//Deepdive Route

router.post("/deepdive/", auth, async (req, res) => {
  try {
    let userId = req.body.userId;
    let userInfo = await getUserInfo(req.userId);
    let ac = await checkAccess(req.userId, userInfo.isManager, req.body.userId);
    if (ac === false) {
      responseSender(res, `You dont have Access`);
    } else {
      let companyId = userInfo.companyId;
      let companyInfo = await getCompanyInfo(companyId);
      if (
        companyInfo.enablewebcam === 0 &&
        companyInfo.enablescreenshot === 0
      ) {
        responseSender(res, `Both Webcam and Screenshot disabled`);
      }
      if (!userId) {
        responseSender(res, `Missing UserId`);
      } else {
        let date;
        date = req.body.date ? new Date(req.body.date) : new Date();
        var dateArray = getDates(startOfWeek(date), endOfWeek(date));
        let rr = [];
        let dailysummary = [];
        async function query(date, userId) {
          let r1 = [];
          const dq = `SELECT DAYNAME(timecard)as tday,HOUR(timecard) as hour,TIME(timecard) as time,timecardId,timecard,clientId,keyCounter,mouseCounter,appName,windowName,windowUrl,screenshotUrl,webcamUrl,status,focus,intensityScore FROM timecard WHERE userId=${userId} AND DATE(timecard) = '${date}' ORDER BY timecard ASC`;
          let dqr = await db.query(dq);
          if (dqr.results.length > 0) {
            let deepdive = dqr.results;
            let Ds = await DailySummary(userId, date);
            if (Ds) {
              dailysummary.push({
                date: date,
                hoursLogged: Ds.hoursLogged,
                focusScore: Ds.focusScore,
                intensityScore: Ds.intensityScore,
                alignmentScore: Ds.alignmentScore,
              });
            }
            for (let i = 0; i < deepdive.length; i++) {
              if (
                companyInfo.enablewebcam === 1 &&
                companyInfo.enablescreenshot === 1
              ) {
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
                  focus: deepdive[i].focus,
                  intensityScore: deepdive[i].intensityScore,
                };
                r1.push(r);
              }
              if (
                companyInfo.enablewebcam === 1 &&
                companyInfo.enablescreenshot === 0
              ) {
                let r = {
                  timecardId: deepdive[i].timecardId,
                  tday: deepdive[i].tday,
                  hour: deepdive[i].hour,
                  time: deepdive[i].time,
                  timecard: deepdive[i].timecard,
                  webcamUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/wclib/tmb/${deepdive[i].webcamUrl}`,
                  webcamUrl: `${CC.CDN_URL}/${companyId}/${userId}/wclib/${deepdive[i].webcamUrl}`,
                  status: deepdive[i].status,
                  focus: deepdive[i].focus,
                  intensityScore: deepdive[i].intensityScore,
                };
                r1.push(r);
              }
              if (
                companyInfo.enablewebcam === 0 &&
                companyInfo.enablescreenshot === 1
              ) {
                let r = {
                  timecardId: deepdive[i].timecardId,
                  tday: deepdive[i].tday,
                  hour: deepdive[i].hour,
                  time: deepdive[i].time,
                  timecard: deepdive[i].timecard,
                  screenshotUrl_thumb: `${CC.CDN_URL}/${companyId}/${userId}/sslib/tmb/${deepdive[i].screenshotUrl}`,
                  screenshotUrl: `${CC.CDN_URL}/${companyId}/${userId}/sslib/${deepdive[i].screenshotUrl}`,
                  status: deepdive[i].status,
                  focus: deepdive[i].focus,
                  intensityScore: deepdive[i].intensityScore,
                };
                r1.push(r);
              }
            }
            let a = groupBy(r1, "hour");
            rr.push(a);
          }
        }
        let startDate = dateArray[0];
        let endDate = dateArray[dateArray.length - 1];
        for (let d = 0; d < dateArray.length; d++) {
          await query(dateArray[d], userId);
        }
        let wS = await WeekSummary(userId, startDate);
        rr.length > 0
          ? res.send({
              startDate,
              endDate,
              hoursLogged: wS ? formatHoursLogged(wS.hoursLogged) : null,
              focusScore: wS ? wS.focusScore : null,
              intensityScore: wS ? wS.intensityScore : null,
              alignmentScore: wS ? wS.alignmentScore : null,
              dailysummary,
              results: rr,
            })
          : responseSender(res, `No timecards available`);
      }
    }
  } catch (e) {
    responseSender(res, e);
  }
});

//Details Route

router.post("/details", auth, async (req, res) => {
  try {
    let userId = req.body.userId;
    let userInfo = await getUserInfo(req.userId);
    let ac = await checkAccess(req.userId, userInfo.isManager, req.body.userId);
    if (ac === false) {
      responseSender(res, `You dont have Access`);
    } else {
      let companyId = req.body.companyId;
      if (!companyId) {
        responseSender(res, `Missing Company Id`);
      } else {
        let companyInfo = await getCompanyInfo(companyId);
        if (
          companyInfo.enablewebcam === 0 &&
          companyInfo.enablescreenshot === 0
        ) {
          responseSender(res, `Both Webcam and Screenshot disabled`);
        }
        if (!userId) {
          responseSender(res, `Missing UserId`);
        } else {
          let date;
          date = req.body.date ? new Date(req.body.date) : new Date();
          var dateArray = getDates(startOfWeek(date), endOfWeek(date));
          let rr = [];
          async function query(date, userId) {
            let r1 = [];
            const dq = `SELECT DAYNAME(timeCardBreakup)as tday,HOUR(timeCardBreakup) as hour,TIME(timeCardBreakup) as time,timecardBreakupId,timecardId,timeCardBreakup,clientId,keyCounter,mouseCounter,appName,windowName,windowUrl,screenshotUrl,webcamUrl,managerComment,commentShared FROM  timecardBreakup WHERE userId=${userId} AND DATE(timeCardBreakup) = '${date}' ORDER BY time`;
            let dqr = await db.query(dq);
            if (dqr.results.length > 0) {
              let deepdive = dqr.results;
              for (let i = 0; i < deepdive.length; i++) {
                if (
                  companyInfo.enablewebcam === 1 &&
                  companyInfo.enablescreenshot === 1
                ) {
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
                  };
                  r1.push(r);
                }
                if (
                  companyInfo.enablewebcam === 1 &&
                  companyInfo.enablescreenshot === 0
                ) {
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
                  };
                  r1.push(r);
                }
                if (
                  companyInfo.enablewebcam === 0 &&
                  companyInfo.enablescreenshot === 1
                ) {
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
                  };
                  r1.push(r);
                }
              }
              let a = groupBy(r1, "hour");
              rr.push(a);
            }
          }
          let startDate = dateArray[0];
          let endDate = dateArray[dateArray.length - 1];
          for (let d = 0; d < dateArray.length; d++) {
            await query(dateArray[d], userId);
          }

          rr.length > 0
            ? res.send({
                startDate,
                endDate,
                results: rr,
              })
            : responseSender(res, `No details available`);
        }
      }
    }
  } catch (error) {
    responseSender(res, error);
  }
});

//Timecard Breakup data from timecardId

router.post("/zoom", auth, async (req, res) => {
  try {
    let timecardId = req.body.timecardId;
    let timecardBreakupId = req.body.timecardBreakupId;
    let startDate = req.body.startDate;
    let endDate = req.body.endDate;
    if (timecardId && timecardBreakupId) {
      responseSender(res, `Send Either timecardId or timecardBreakupId`);
    }
    if (!(timecardId || timecardBreakupId)) {
      responseSender(
        res,
        `Missing Data- Either Timecard or Timecard Breakup Id required`
      );
    } else {
      if (timecardBreakupId) {
        timecardId = await getTimecardId(timecardBreakupId);
      }
      if (!(startDate && endDate)) {
        responseSender(res, `Missing Start Date and End Date`);
      } else {
        let userInfo = await getUserInfo(req.userId);
        let comapanyInfo = await getCompanyInfo(userInfo.companyId);
        //Get all timecard data
        let tQ = `SELECT YEAR(timecard) as timecardYear,MONTH(timecard) as timecardMonth,DAY(timecard)as timecardDay,
                            HOUR(timecard) as timecardHour,MINUTE(timecard) as timecardMinute,timecard,
                            userId,status,focus,intensityScore
                            FROM timecard
                            WHERE timecardId = ${timecardId}`;
        let tQR = await db.query(tQ);
        let timecardYear = tQR.results[0].timecardYear;
        let timecardMonth = tQR.results[0].timecardMonth;
        let timecardDay = tQR.results[0].timecardDay;
        let timecardHour = tQR.results[0].timecardHour;
        let timecardMinute = tQR.results[0].timecardMinute;
        let userId = tQR.results[0].userId;
        let status = tQR.results[0].status;
        let focus = tQR.results[0].focus;
        let intensityScore = tQR.results[0].intensityScore;
        //Querying from Timecard Breakup table

        const tBQ = `SELECT timecardBreakupId,timeCardBreakup,userId,clientId,screenshotUrl,webcamUrl,
                            managerComment,commentShared FROM timecardBreakup WHERE userId = ${userId} AND
                            YEAR(timeCardBreakup) = ${timecardYear} AND MONTH(timeCardBreakup) = ${timecardMonth} AND
                            DAY(timeCardBreakup) = ${timecardDay} AND HOUR(timeCardBreakup) = ${timecardHour} AND
                            MINUTE(timeCardBreakup)
                            BETWEEN ${timecardMinute} AND ${
          timecardMinute + comapanyInfo.timecardsize - 1
        }
                            ORDER BY timeCardBreakup ASC`;
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
          };
          rr.push(r);
        }
        //Query to find Next and Previous timecards
        const pnq = `SELECT timecardId,timecard
                            FROM timecard
                            WHERE userId =${userId} AND DATE(timecard) BETWEEN '${startDate}' AND '${endDate}'
                            ORDER BY timecard  ASC`;
        let pnqR = await db.query(pnq);
        let PN = prevnext(pnqR.results, timecardId);
        res.send({
          status,
          focus: focusSetter(
            focus,
            comapanyInfo.timecardbreakupsize,
            comapanyInfo.timecardsize
          ),
          intensityScore,
          PreviousTimecard: PN.pTiD,
          NextTimeCard: PN.nTiD,
          results: rr,
        });
      }
    }
  } catch (error) {
    responseSender(res, Error);
  }
});

//Flagging Timecard

router.post("/flag/:timecard", auth, async (req, res) => {
  try {
    let userInfo = await getUserInfo(req.userId);
    let timecardId = req.params.timecard;
    if (!timecardId) {
      responseSender(res, `No timecard specified to Flag`);
    } else {
      if (userInfo.isManager !== 1) {
        responseSender(res, `You don't have access to flag timecard`);
      } else {
        let status = await checkTimecardStatus(timecardId);
        if (status === "flagged") {
          let unflag = await updateTImecardStatus(timecardId, "approved");
          unflag === true
            ? responseSender(res, `Successfully Unflagged`)
            : responseSender(res, `Timecard with the specified ID Not Found`);
        } else {
          let flag = await updateTImecardStatus(timecardId, "flagged");
          flag === true
            ? responseSender(res, `Successfully Flagged`)
            : responseSender(res, `Timecard with the specified ID Not Found`);
        }
      }
    }
  } catch (error) {
    responseSender(res, error);
  }
});

router.post("/comment/:id", auth, async (req, res) => {
  try {
    let timecardBreakupId = req.params.id;
    let userInfo = await getUserInfo(req.userId);
    var today = new Date();
    var date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    var time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + " " + time;
    if (!timecardBreakupId) {
      responseSender(res, `No timecardBreakupId Specified`);
    } else {
      let comment = req.body.comment;
      if (!comment) {
        responseSender(res, `Please Send Some Mesaage`);
      } else {
        let sql = `SELECT managerComment
                            FROM timecardBreakup
                            WHERE timecardBreakupId = ${timecardBreakupId}`;
        let sqlR = await db.query(sql);
        if (sqlR.results.length <= 0) {
          responseSender(res, `Wrong timecardBreakupId`);
        } else {
          let managerComment = sqlR.results[0].managerComment;
          let mc = JSON.parse(managerComment) || [];
          mc.push({
            dateTime,
            from: userInfo.name,
            message: comment,
          });
          const IQ = `UPDATE timecardBreakup
                        SET managerComment = '${JSON.stringify(mc)}'
                        WHERE timecardBreakupId=${timecardBreakupId}`;
          let IQR = await db.query(IQ);
          IQR.results.affectedRows > 0
            ? responseSender(res, `Comment Sent`)
            : responseSender(res, `Error During Updating Comment`);
        }
      }
    }
  } catch (error) {
    responseSender(res, error);
  }
});

router.get("/comment/:id", auth, async (req, res) => {
  try {
    let timecardBreakupId = req.params.id;
    if (!timecardBreakupId) {
      responseSender(res, `Missing timecardBreakupId`);
    } else {
      const sql = `SELECT managerComment
                            FROM timecardBreakup
                            WHERE timecardBreakupId = ${timecardBreakupId}`;
      let sqlR = await db.query(sql);

      sqlR.results.length > 0
        ? responseSender(res, JSON.parse(sqlR.results[0].managerComment))
        : responseSender(res, `Wrong timecardBreakupId`);
    }
  } catch (error) {
    responseSender(res, error);
  }
});

router.post("/timecard", auth, async (req, res) => {
  try {
    let userId = req.userId;
    let method = req.body.method || "list"; // list,request,approval
    let hierarchy = req.body.hierarchy || "Direct"; //Direct,Full
    let timecardIds = req.body.timecardIds;
    let comments = req.body.comments;
    let status = req.body.status; // approved,rejected
    let userInfo = await getUserInfo(userId);
    if (method === "list") {
      if (userInfo.isManager !== 1) {
        responseSender(res, `You Don't have access`);
      } else {
        if (hierarchy === "Direct" || hierarchy === "Full") {
          let memberIds = await getMemberIds(userId, hierarchy);
          //Get list of timecardDisputes
          let tDQ = `SELECT user.name,user.empId,timecard.timecardId,timecardDisputes.disputeReason,DATE_FORMAT(timecard.timecard,'%Y-%m-%d %H:%i') as timecard,clientId,keyCounter,mouseCounter,appName,windowName,windowUrl,CONCAT(user.userId, "/",DATE(timecard.timecard)) as timecardLink
                        FROM timecardDisputes,timecard,user
                        WHERE timecard.timecardId =timecardDisputes.timecardId AND timecardDisputes.userID IN(${memberIds.toString()})AND timecardDisputes.status = 'open' AND user.userId = timecard.userId`;
          let tDQR = await db.query(tDQ);
          tDQR.results.length < 1
            ? responseSender(res, "No Open Disputes")
            : res.send(tDQR.results);
        } else {
          responseSender(res, "hierarchy either Direct or Full");
        }
      }
    }
    if (method === "delete") {
      if (!timecardIds) {
        responseSender(res, "No timecard Specified");
      } else {
        //TODO delete timecard
      }
    }
    if (method === "request") {
      if (!timecardIds) {
        responseSender(res, "No timecard Specified");
      } else {
        let st = true;
        for (let t = 0; t < timecardIds.length; t++) {
          let id = await timecardDisputesHandler("add", timecardIds[t], {
            userId,
            disputeReason: comments,
            status: "open",
          });
          if (id === false || id === null) {
            st = false;
          }
        }
        st
          ? responseSender(res, "Dispute Raised Successfully")
          : responseSender(res, "Error During Raising Dispute");
      }
    }
    if (method === "approval") {
      if (userInfo.isManager !== 1) {
        responseSender(res, `You don't have access`);
      } else {
        if (!timecardIds) {
          responseSender(res, "No timecard Specified");
        } else {
          let st = true;
          for (let t = 0; t < timecardIds.length; t++) {
            let ud = await timecardDisputesHandler("update", timecardIds[t], {
              approverComments: comments,
              status: status,
            });
            if (ud === false || ud === null) {
              st = false;
            }
          }
          if (st == true) {
            responseSender(res, "Dispute Updated Successfully");
          } else {
            responseSender(res, "Error During Updating Dispute");
          }
        }
      }
    }
  } catch (error) {
    responseSender(res, error);
  }
});

router.post("/manualtimecard", auth, async (req, res) => {
  try {
    let userId = req.userId;
    let method = req.body.method || "list"; //list,request,approval
    let hierarchy = req.body.hierarchy || "Direct"; //Direct,Full
    let date = req.body.date;
    let startTime = req.body.startTime;
    let EndTime = req.body.EndTime;
    let reason = req.body.reason;
    let manualtimecardIds = req.body.manualtimecardIds;
    let comments = req.body.comments;
    let status = req.body.status;
    let userInfo = await getUserInfo(userId);
    if (method === "list") {
      if (userInfo.isManager !== 1) {
        responseSender(res, `You don't have access`);
      } else {
        let memberIds = await getMemberIds(userId, hierarchy);
        //Get list of ManualTimecards
        let mtQ = `SELECT manualTimeId,startTime,endTime,manualTimeReason
                        FROM manualTime
                        WHERE manualTime.userID IN(${memberIds.toString()})AND manualTime.status = 'open'`;

        let mtQR = await db.query(mtQ);
        mtQR.results.length < 1
          ? responseSender(res, "No Manual Timecards requested")
          : res.send(mtQR.results);
      }
    }
    if (method === "request") {
      if (!(date && startTime && EndTime && reason)) {
        responseSender(res, `Missing Fields`);
      } else {
        let r = await manualTimecardHandler("add", userId, {
          startTime: startTime,
          endTime: EndTime,
          reason: reason,
          status: "open",
        });
        r
          ? responseSender(res, "Manual Timecard Requested Successfully")
          : responseSender(res, "Error During requesting Manula Timecard");
      }
    }
    if (method === "approval") {
      if (userInfo.isManager !== 1) {
        responseSender(res, `You don't have access`);
      } else {
        if (!manualtimecardIds) {
          responseSender(res, "No Id Specified");
        } else {
          let st = true;
          for (let t = 0; t < manualtimecardIds.length; t++) {
            let ud = await manualTimecardHandler(
              "update",
              manualtimecardIds[t],
              {
                approverComments: comments,
                status: status,
              }
            );
            if (ud === false || ud === null) {
              st = false;
            }
          }
          st
            ? responseSender(res, "Manual Timecard Updated Successfully")
            : responseSender(res, "Error During Updating Manual Timecard");
        }
      }
    }
  } catch (error) {
    responseSender(res, error);
  }
});

router.post("/mytasks", auth, async (req, res) => {
  try {
  } catch (error) {
    responseSender(res, error);
  }
});

router.post("/newcompany", auth, async (req, res) => {
  try {
    let method = req.body.method || "list"; // list,add,delete
    let compnayId = req.body.compnayId;
    //Data for Adding New Compnay
    let name = req.body.name;
    let fullName = req.body.fullName;
    let address = req.body.address;
    let city = req.body.city;
    let state = req.body.state;
    let pincode = req.body.pincode;
    let country = req.body.country;
    let billingPlan = req.body.billingPlan;
    let billingRate = req.body.billingRate;
    let billingCurrency = req.body.billingCurrency;
    let timecardsize = req.body.timecardsize;
    let timecardbreakupsize = req.body.timecardbreakupsize;
    let enablewebcam = req.body.enablewebcam;
    let enablescreenshot = req.body.enablescreenshot;
    let mousePerTC = req.body.mousePerTC;
    let keysPerTC = req.body.keysPerTC;
    let IntDiscard = req.body.IntDiscard;
    let intRed = req.body.intRed;
    let intYellow = req.body.intYellow;
    let termsConditions = req.body.termsConditions;
    let updated = req.body.updated;
    let updatedBy = req.body.updatedBy;
    //TODO check access
    if (method === "list") {
      let cQ = `SELECT name,fullName,address,city,state,pincode,country,billingPlan,billingRate,billingCurrency,status,timecardsize,timecardbreakupsize,enablewebcam,enablescreenshot,mousePerTC,keysPerTC,IntDiscard,intRed,intYellow,termsConditions,updated,updatedBy
            FROM company
            WHERE status ='active'`;
      let cQR = await db.query(cQ);
      cQR.results < 1
        ? responseSender(res, `No Company to List`)
        : res.send(cQR.results);
    }
    if (method === "add") {
      res.send({
        hello: "Coming Soon",
        message: req.body,
      });
    }
    if (method === "delete") {
      if (!compnayId) {
        responseSender(res, `No CompanyId`);
      } else {
        let uQ = `UPDATE company SET status ='Inactive' WHERE companyId=${compnayId}`;
        let uQR = await db.query(uQ);
        uQR.results.affectedRows === 1
          ? responseSender(res, `Updated`)
          : responseSender(res, `Error During Update`);
      }
    }
  } catch (error) {
    responseSender(res, error);
  }
});

router.post("/teamhandler", auth, async (req, res) => {
  try {
  } catch (error) {
    responseSender(res, error);
  }
});

router.post("/userhandler", auth, async (req, res) => {
  try {
  } catch (error) {
    responseSender(res, error);
  }
});
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
    let { results } = await db.query(sql, [companyname, username, username]);
    if (Object.keys(results).length === 0) {
      res.send({
        auth: 0,
        message: "No user.",
      });
    } else {
      let haspass = results[0].password;
      bcrypt.compare(password, haspass, async function (err, result) {
        if (result) {
          res.send({
            auth: 1,
            userId: results[0].userId,
            userName: results[0].name,
            companyId: results[0].companyId,
            tcSize: results[0].timecardsize,
            tcbSize: results[0].timecardbreakupsize,
            webcam: results[0].enablewebcam,
            screenshot: results[0].enablescreenshot,
          });
        } else {
          res.send({
            auth: 0,
            message: "Invalid credentials.",
          });
        }
      });
    }
  } catch (error) {
    res.send({
      auth: 0,
      message: error,
    });
  }
});

module.exports = router;
