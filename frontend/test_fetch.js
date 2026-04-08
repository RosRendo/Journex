fetch('http://localhost:5000/api/accounts')
  .then(r => r.json())
  .then(j => {
    if (j.data && j.data.length > 0) {
      console.log('KEYS:', Object.keys(j.data[0]));
      console.log('ACCOUNT 0:', j.data[0]);
    } else {
      console.log('No accounts returned');
    }
  });
