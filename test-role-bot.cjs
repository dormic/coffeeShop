async function test() {
  const res = await fetch('https://api.vsegpt.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.VSEGPT_API_KEY
    },
    body: JSON.stringify({
      model: "openai/gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "bot", content: "I am a bot" },
        { role: "user", content: "Hello!" }
      ],
      temperature: 0.3,
      max_tokens: 800
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
