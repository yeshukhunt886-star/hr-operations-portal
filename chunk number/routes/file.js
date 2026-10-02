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

const express = require("express");
const app = express();

app.use(express.json());

app.use("/api", require("./file"));

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});const express = require("express");
const fs = require("fs");
const router = express.Router();


router.get("/generate-file", (req, res) => {
  const writeStream = fs.createWriteStream("big-sheet.txt");

  writeStream.write("id,name,email,city,amount\n");

  let i = 0;
  const TOTAL_ROWS = 1000000;
  const CHUNK_SIZE = 1000;

  console.log("File generation started...");

  function write() {
    let chunkCount = 0;
    let chunkData = "";

    while (i < TOTAL_ROWS && chunkCount < CHUNK_SIZE) {
      chunkData += `${i},user${i},user${i}@mail.com,city${i % 100},${Math.random() * 1000}\n`;

      i++;
      chunkCount++;
    }

    const ok = writeStream.write(chunkData);
        console.log(`${i} records inserted | Total: 1000`);

    if (i < TOTAL_ROWS) {
      if (ok) {
        write();
      } else {
        writeStream.once("drain", write);
      }
    } else {
      writeStream.end();
    }
  }

  writeStream.on("finish", () => {
    console.log("File created successfully");

    res.json({
      success: true,
      message: "File generated successfully",
      file: "big-sheet.txt",
      totalRows: TOTAL_ROWS,
    });
  });

  writeStream.on("error", (err) => {
    console.log("Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  });

  write();

});

module.exports = router;


