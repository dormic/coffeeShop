const https = require('https');
const options = {
  hostname: 'api.vsegpt.ru',
  path: '/v1/models',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + process.env.VSEGPT_API_KEY
  }
};
const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', e => console.error(e));
req.end();
