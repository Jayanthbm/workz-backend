const AWS = require('aws-sdk');
const CC = require('./constants');
// Try to use process.env.PRIVATE_KEY instead of exposing your key

const cloudFront = new AWS.CloudFront.Signer(CC.cfpublickey, CC.cfprivateKey);

cloudFront.getSignedUrl({
  url: 'https://cdn.workforcez.net/1/21/sslib/sc_1_202002251610.jepg',
  expires: Math.floor((new Date()).getTime() / 1000) + (60 * 60 * 1) // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
}, (err, url) => {
  if (err) {
    console.log(`Error:`)
  }
  console.log(url);
});