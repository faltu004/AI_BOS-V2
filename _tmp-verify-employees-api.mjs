const base = "http://127.0.0.1:5000/api/v1";

const loginRes = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "ananya.iyer@aibos.company", password: "Admin@12345" }),
});
const loginJson = await loginRes.json();
const token = loginJson.data.tokens.accessToken;

const usersRes = await fetch(`${base}/users`, { headers: { Authorization: `Bearer ${token}` } });
const usersJson = await usersRes.json();
console.log("Status:", usersRes.status);
console.log("Count:", usersJson.data.length);
console.log("Sample (Rajeev Khanna):", JSON.stringify(usersJson.data.find((u) => u.fullName === "Rajeev Khanna"), null, 2));
