async function sync() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/trades/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 30 })
    });
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}

sync();
