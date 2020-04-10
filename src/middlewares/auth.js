const jwt = require("jsonwebtoken");
const CC = require("../constants");

module.exports = (req, res, next) => {
    const {
        authorization
    } = req.headers;
    if (!authorization) {
        return res.send({
            message: "You must be logged in."
        });
    }
    const token = authorization.replace("Bearer ", "");
    jwt.verify(token, CC.SECRET_KEY, async (err, payload) => {
        if (err) {
            return res.send({
                message: "You must be logged in."
            });
        }
        req.userId = payload.userId;
        next();
    });
};