import fs from "fs";
import ExcelJS from "exceljs";

const processExcel = (filePath, onRow) => {
  return new Promise((resolve, reject) => {
    const workbook = new ExcelJS.Workbook();
    workbook.xlsx
      .read(fs.createReadStream(filePath))
      .then(() => {
        const worksheet = workbook.getWorksheet(1);
        let headers;
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) {
            headers = row.values.slice(1);
            return;
          }
          const rowData = {};
          row.values.slice(1).forEach((value, i) => {
            rowData[headers[i]] = value;
          });
          onRow(rowData);
        });
        resolve();
      })
      .catch(reject);
  });
};

export default { processExcel };
