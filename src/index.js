const express = require("express");
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes/router');
const app = express();
let origin = ["http://localhost", "http://localhost:4000", "http://localhost:3001"]; //List of Origins to be Allowed
const corsOptions = {
    origin,
    credentials: true
}
app.use(cors(corsOptions));
app.use(function (req, res, next) {
    let org = req.get("Origin");
    if (org) {
        res.setHeader('Access-Control-Allow-Origin', org);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(bodyParser.json());
app.use(routes);
app.listen(4000, () => {
    console.log("Server is running on port 4000.");
});