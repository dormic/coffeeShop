const https = require('https');
const payload = JSON.stringify({
  model: "openai/gpt-3.5-turbo",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" }
  ],
  temperature: 0.3,
  max_tokens: 800
});

const options = {
  hostname: 'api.vsegpt.ru',
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.VSEGPT_API_KEY
  }
};
const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
req.on('error', e => console.error(e));
req.write(payload);
req.end();
