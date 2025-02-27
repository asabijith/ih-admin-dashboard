const ADMIN_CREDS = {
  email: 'admin@007',
  password: 'admin@007'
};

const SHEET_IDS = {
  ideation: '1z3qZ9OjFi8ERpNK2CBkS4Qs7L7iDs3uUD_y1bIuM94w',
  hackathon: '19DNtYPCcmseOFCy8m5AatpPWix4dANxhoGxuq4tcBLw'
};

// You may need to change this if your sheet has a different name
const SHEET_NAMES = {
  ideation: 'Form Responses 1', // This is often the default name for form responses
  hackathon: 'Form Responses 1'
};

let currentView = 'ideation';
let realtimeData = [];
let updateInterval;

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (email === ADMIN_CREDS.email && password === ADMIN_CREDS.password) {
      localStorage.setItem('authenticated', 'true');
      showDashboard();
  } else {
      alert('Invalid credentials!');
  }
  return false;
}

function showDashboard() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  initializeDashboard();
}

if (localStorage.getItem('authenticated') === 'true') {
  showDashboard();
}

function initializeDashboard() {
  fetchSheetData();
  // Clear any existing interval
  if (updateInterval) {
      clearInterval(updateInterval);
  }
  // Set up new interval for real-time updates
  updateInterval = setInterval(fetchSheetData, 30000);
}

async function fetchSheetData() {
  document.getElementById('loading').style.display = 'flex';
  try {
      const sheetId = SHEET_IDS[currentView];
      const sheetName = SHEET_NAMES[currentView];
      
      // Try to fetch using public access without API key first
      let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
      
      const response = await fetch(url);
      const text = await response.text();
      
      // The response is not pure JSON, it's wrapped in a callback function
      // We need to extract the JSON part
      const jsonStartIndex = text.indexOf('{');
      const jsonEndIndex = text.lastIndexOf('}') + 1;
      const jsonString = text.substring(jsonStartIndex, jsonEndIndex);
      const data = JSON.parse(jsonString);
      
      // Convert the Google Visualization API format to our expected format
      const rows = data.table.rows;
      realtimeData = [
          // Extract header row - the column labels
          data.table.cols.map(col => col.label)
      ];
      
      // Extract data rows
      rows.forEach(row => {
          const rowData = row.c.map(cell => cell ? (cell.v || '') : '');
          realtimeData.push(rowData);
      });

      console.log("Raw data received:", realtimeData); // Debug log to see data structure
      
      updateUI();
  } catch (error) {
      console.error("Error fetching sheet data:", error);
      
      // Show more detailed error for debugging
      document.getElementById('stats').innerHTML = 
          `<div class="stat-card error"><h3>Error Loading Data</h3>
          <p>Please make sure:</p>
          <ul>
              <li>Your spreadsheet is publicly accessible (File > Share > Anyone with the link)</li>
              <li>The spreadsheet ID is correct</li>
              <li>Your form responses are in the expected sheet</li>
          </ul>
          <p>Detailed error: ${error.message}</p></div>`;
          
      alert(`Error loading ${currentView} data. Please check console for details.`);
  } finally {
      document.getElementById('loading').style.display = 'none';
  }
}

function switchView(view) {
  if (currentView === view) return;
  
  // Update active button
  document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().toLowerCase().includes(view));
  });
  
  // Update view and fetch new data
  currentView = view;
  document.getElementById('dashboardTitle').innerHTML = 
      `<span class="fluent-color--person-key-32"></span> Admin Dashboard - ${view.charAt(0).toUpperCase() + view.slice(1)}`;
  fetchSheetData();
}

function updateUI() {
  updateStats();
  updateTable();
}

function updateStats() {
  const statsContainer = document.getElementById('stats');
  if (!realtimeData.length) {
      statsContainer.innerHTML = '<div class="stat-card"><h3>No Data Available</h3></div>';
      return;
  }

  const totalRegistrations = Math.max(0, realtimeData.length - 1);
  
  // Determine column indexes for department and college
  // This assumes headers are in the first row
  let departmentIndex = -1;
  let collegeIndex = -1;
  
  // Try to find the actual column indexes based on headers
  const headers = realtimeData[0] || [];
  for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header.includes('department')) {
          departmentIndex = i;
      }
      if (header.includes('college')) {
          collegeIndex = i;
      }
  }
  
  console.log("College index:", collegeIndex, "Department index:", departmentIndex); // Debug
  
  // Safely get unique departments and colleges
  const departments = new Set();
  const colleges = new Set();
  
  realtimeData.slice(1).forEach(row => {
      if (departmentIndex !== -1 && row && row.length > departmentIndex && row[departmentIndex]) 
          departments.add(row[departmentIndex]);
      if (collegeIndex !== -1 && row && row.length > collegeIndex && row[collegeIndex]) 
          colleges.add(row[collegeIndex]);
  });

  statsContainer.innerHTML = `
      <div class="stat-card">
          <h3><span class="fluent-color--apps-list-detail-20"></span>Total Registrations</h3>
          <p>${totalRegistrations}</p>
      </div>
      <div class="stat-card">
          <h3><span class="fluent-color--chart-multiple-24"></span>Unique Departments</h3>
          <p>${departments.size}</p>
      </div>
      <div class="stat-card">
          <h3><span class="fluent-color--building-multiple-20"></span>Participating Colleges</h3>
          <p>${colleges.size}</p>
      </div>
  `;
}

function updateTable() {
  const tableBody = document.querySelector("#dataTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (realtimeData.length <= 1) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="7" style="text-align: center">No data available</td>';
      tableBody.appendChild(tr);
      return;
  }

  // Find column indexes for all relevant data
  const headers = realtimeData[0] || [];
  console.log("Headers:", headers); // Debug log
  
  // Find indexes for member names (up to 3 members)
  const memberNameIndexes = [];
  for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header.includes('member 1') || 
          header.includes('member 2') || 
          header.includes('member 3') ||
          (header.includes('name') && !header.includes('college'))) {
          memberNameIndexes.push(i);
      }
  }
  
  // If we couldn't find any name columns, use a fallback approach
  if (memberNameIndexes.length === 0) {
      // Fallback: look for timestamp and use the next few columns
      const timestampIndex = headers.findIndex(h => String(h || '').toLowerCase().includes('timestamp'));
      if (timestampIndex !== -1) {
          for (let i = 1; i <= 3; i++) {
              if (timestampIndex + i < headers.length) {
                  memberNameIndexes.push(timestampIndex + i);
              }
          }
      }
  }
  
  const columnMapping = {
      memberNames: memberNameIndexes, // Array of member name indexes
      email: headers.findIndex(h => String(h || '').toLowerCase().includes('email')), // Email
      phone: headers.findIndex(h => String(h || '').toLowerCase().includes('phone')), // Phone
      college: headers.findIndex(h => String(h || '').toLowerCase().includes('college')), // College
      department: headers.findIndex(h => String(h || '').toLowerCase().includes('department')), // Department
      semester: headers.findIndex(h => String(h || '').toLowerCase().includes('semester')) // Semester/Team
  };
  
  console.log("Column mapping indexes:", columnMapping); // Debug log

  realtimeData.slice(1).forEach((row, index) => {
      const tr = document.createElement("tr");
      
      // Collect all member names
      const memberNames = columnMapping.memberNames
          .map(idx => (idx !== -1 && idx < row.length) ? sanitizeHTML(row[idx] || '') : '')
          .filter(name => name.trim() !== '') // Remove empty names
          .join(', ') || '-'; // Join multiple names with comma
      
      // Get other data
      const email = columnMapping.email !== -1 && columnMapping.email < row.length ? 
          sanitizeHTML(row[columnMapping.email] || '-') : '-';
      const phone = columnMapping.phone !== -1 && columnMapping.phone < row.length ? 
          sanitizeHTML(row[columnMapping.phone] || '-') : '-';
      const college = columnMapping.college !== -1 && columnMapping.college < row.length ? 
          sanitizeHTML(row[columnMapping.college] || '-') : '-';
      const department = columnMapping.department !== -1 && columnMapping.department < row.length ? 
          sanitizeHTML(row[columnMapping.department] || '-') : '-';
      const semester = columnMapping.semester !== -1 && columnMapping.semester < row.length ? 
          sanitizeHTML(row[columnMapping.semester] || '-') : '-';
      
      tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${memberNames}</td>
          <td>${email}</td>
          <td>${phone}</td>
          <td>${college}</td>
          <td>${department}</td>
          <td>${semester}</td>
      `;
      tableBody.appendChild(tr);
  });
}
async function downloadPDF() {
  document.getElementById('loading').style.display = 'flex';
  
  try {
      const element = document.createElement('div');
      element.innerHTML = `
          <h2 style="text-align: center; margin-bottom: 20px;">
              ${currentView.charAt(0).toUpperCase() + currentView.slice(1)} Registration Report
          </h2>
          ${document.querySelector('.table-container').innerHTML}
      `;

      const opt = {
          margin: 1,
          filename: `${currentView}_report_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      await html2pdf().set(opt).from(element).save();
  } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF. Please try again.');
  } finally {
      document.getElementById('loading').style.display = 'none';
  }
}

function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
