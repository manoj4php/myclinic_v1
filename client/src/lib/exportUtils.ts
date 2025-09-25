import * as XLSX from 'xlsx';

interface ExportConfig {
  data: any[];
  filename: string;
  sheetName?: string;
  dateFields?: string[];
}

export const exportToExcel = ({ data, filename, sheetName = 'Sheet1', dateFields = [] }: ExportConfig) => {
  // Process dates if any
  const processedData = data.map(item => {
    const processed = { ...item };
    dateFields.forEach(field => {
      if (processed[field]) {
        processed[field] = new Date(processed[field]).toLocaleDateString();
      }
    });
    return processed;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(processedData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Save to file
  XLSX.writeFile(wb, `${filename}.xlsx`);
};