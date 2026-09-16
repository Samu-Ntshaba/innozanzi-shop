const base=process.env.NEXT_PUBLIC_SITE_URL??process.env.SITE_URL,secret=process.env.CRON_SECRET;
if(!base||!secret)throw new Error("SITE_URL and CRON_SECRET are required for the Trading worker.");
const response=await fetch(new URL("/api/cron/trading-scan",base),{method:"POST",headers:{authorization:`Bearer ${secret}`}});
if(!response.ok)throw new Error(`Trading worker failed with HTTP ${response.status}`);
console.log(await response.text());
