const fs = require('fs');

const writeStream = fs.createWriteStream('big-sheet.txt');

writeStream.write('id,name,email,city,amount\n');

let i = 0;

const TOTAL_ROWS = 1_000_000;   // safer for demo
const CHUNK_SIZE = 1000;

function write() {
  let ok = true;
  let chunkCount = 0;
  let chunkData = '';

  while (i < TOTAL_ROWS && ok && chunkCount < CHUNK_SIZE) {

    const row = `${i},user${i},user${i}@mail.com,city${i % 100},${Math.random() * 1000}\n`;

    chunkData += row;

    i++;
    chunkCount++;
  }

  // write 1000 records at once
  ok = writeStream.write(chunkData);

  console.log(`Chunk written: ${chunkCount} records | Total: ${i}`);

  if (i < TOTAL_ROWS) {
    writeStream.once('drain', write);
  } else {
    writeStream.end();
  }
}

// finish event
writeStream.on('finish', () => {
  console.log('File created successfully: big-sheet.txt');
});

writeStream.on('error', (err) => {
  console.log(' Error:', err);
});

write();

console.log(' Generating file in chunks...');