const ADMIN_CREDS = {
    email: 'admin@007',
    password: 'admin@007'
};

const SHEET_IDS = {
    ideation: '1z3qZ9OjFi8ERpNK2CBkS4Qs7L7iDs3uUD_y1bIuM94w', // Your actual spreadsheet ID
    hackathon: '1z3qZ9OjFi8ERpNK2CBkS4Qs7L7iDs3uUD_y1bIuM94w' // Using same ID for both views for now
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
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=AIzaSyBTvxdG5xX_54ndGNYZd9l4iCZJalCSO74`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        realtimeData = data.values || [];
        updateUI();
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        alert(`Error loading ${currentView} data. Please try again.`);
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
    
    // Check if we have department and college data at expected indices
    // Safely get unique departments and colleges, handling potential missing data
    const departments = new Set();
    const colleges = new Set();
    
    realtimeData.slice(1).forEach(row => {
        if (row && row.length > 4 && row[4]) departments.add(row[4]);
        if (row && row.length > 3 && row[3]) colleges.add(row[3]);
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

    realtimeData.slice(1).forEach((row, index) => {
        const tr = document.createElement("tr");
        
        // Ensure we have all the required columns, even if data is missing
        const safeRow = Array(7).fill('-');
        row.forEach((cell, i) => {
            if (i < 7) safeRow[i] = cell || '-';
        });
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${sanitizeHTML(safeRow[0])}</td>
            <td>${sanitizeHTML(safeRow[1])}</td>
            <td>${sanitizeHTML(safeRow[2])}</td>
            <td>${sanitizeHTML(safeRow[3])}</td>
            <td>${sanitizeHTML(safeRow[4])}</td>
            <td>${sanitizeHTML(safeRow[5])}</td>
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
