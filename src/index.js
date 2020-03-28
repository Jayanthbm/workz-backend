const express = require("express");
const bodyParser = require('body-parser');
const routes = require('./routes/router');
const app = express();
app.use(bodyParser.json());
app.use(routes);
app.listen(4000, () => {
    console.log("Server is running on port 4000.");
});