import fs from "fs";
import { parse } from "fast-csv";

const processCSV = (filePath, onRow) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true, trim: true }))
      .on("data", (row) => onRow(row))
      .on("end", () => resolve())
      .on("error", reject);
  });
};

export default { processCSV };
