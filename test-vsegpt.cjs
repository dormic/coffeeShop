async function test() {
  const res = await fetch('https://api.vsegpt.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.VSEGPT_API_KEY,
      'X-Title': 'My App'
    },
    body: JSON.stringify({
      model: "openai/gpt-3.5-turbo",
      messages: [{role: "user", content: "hi"}]
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
