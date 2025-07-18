// Global variable to store options fetched from the backend
let mhtcetOptions = {
    categories: { PCM: [], PCB: [] },
    branches: { PCM: [], PCB: [] }
};

// DOM Elements
const groupSelect = document.getElementById('group');
const catSelect = document.getElementById('category');
const branchSelect = document.getElementById('branch');
const resultsDiv = document.getElementById("results");
let currentResults = [];

/**
 * Fetches MHT-CET options (categories, branches) from the backend.
 */
async function fetchMhtcetOptions() {
    try {
        // तुमच्या लाइव्ह Render API ची URL वापरा
        const response = await fetch("https://cet-guru-api.onrender.com/get-mhtcet-options");
        if (!response.ok) {
            throw new Error('Failed to load MHT-CET options from server.');
        }
        mhtcetOptions = await response.json();
        // Populate the dropdowns for the first time
        filterOptions(); 
    } catch (error) {
        console.error("Error fetching MHT-CET options:", error);
        catSelect.innerHTML = '<option>Error loading categories</option>';
        branchSelect.innerHTML = '<option>Error loading branches</option>';
    }
}

/**
 * Populates category and branch dropdowns based on the selected group.
 */
function filterOptions() {
    const selectedGroup = groupSelect.value;
    
    // Clear previous options
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    branchSelect.innerHTML = '<option value="">-- Select Branch --</option>';

    // Populate Category dropdown
    const categoriesForGroup = mhtcetOptions.categories[selectedGroup] || [];
    if (categoriesForGroup.length > 0) {
        categoriesForGroup.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    } else {
        catSelect.innerHTML = '<option>No categories found</option>';
    }

    // Populate Branch dropdown
    const branchesForGroup = mhtcetOptions.branches[selectedGroup] || [];
    if (branchesForGroup.length > 0) {
        branchesForGroup.forEach(b => branchSelect.innerHTML += `<option value="${b}">${b}</option>`);
    } else {
        branchSelect.innerHTML = '<option>No branches found</option>';
    }
}

/**
 * Predicts colleges based on user input.
 */
async function predictColleges() {
    const percentile = parseFloat(document.getElementById('percentile').value);
    const group = document.getElementById('group').value;
    const category = document.getElementById('category').value;
    const branch = document.getElementById('branch').value;
    const city = document.getElementById('city').value.trim();

    if (isNaN(percentile) || !category || !branch) {
        alert("Please enter your percentile and select a category and branch.");
        return;
    }

    resultsDiv.innerHTML = `
        <div class="results-loading">
            <div class="spinner"></div>
            <p>Finding the best colleges for you...</p>
        </div>
    `;

    try {
        const response = await fetch("https://cet-guru-api.onrender.com/predict/mhtcet", {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentile, group, category, branch, city })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        const data = await response.json();
        currentResults = data;
        displayColleges(data);

    } catch (err) {
        resultsDiv.innerHTML = `<div class="no-results"><strong>Error:</strong> Could not get prediction. Please check the backend server logs. <br>Details: ${err.message}</div>`;
        console.error(err);
    }
}

/**
 * Displays the list of predicted colleges.
 */
function displayColleges(data) {
    resultsDiv.innerHTML = '';
    const userPercentile = parseFloat(document.getElementById('percentile').value);

    if (data.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results"><p>No matching colleges found.</p></div>';
        return;
    }
    
    const resultHeader = document.createElement('h3');
    resultHeader.textContent = `Found ${data.length} potential colleges for you:`;
    resultsDiv.appendChild(resultHeader);

    data.forEach(college => {
        const cutoff = college["Percent"];
        const difference = userPercentile - cutoff;
        let chance = 'Tough Chance';
        let chanceClass = 'chance-low';
        if (difference >= 3) {
            chance = 'High Chance';
            chanceClass = 'chance-high';
        } else if (difference >= 0.5) {
            chance = 'Medium Chance';
            chanceClass = 'chance-medium';
        }

        const div = document.createElement("div");
        div.className = "college-card";
        // --- ही रचना महत्त्वाची आहे ---
        div.innerHTML = `
            <strong class="college-title">${college["College Name"]}</strong>
            <p><strong>College Code:</strong> <span>${college["College Code"] || 'N/A'}</span></p>
            <p><strong>Branch:</strong> <span>${college["Course Name"]}</span></p>
            <p><strong>Category:</strong> <span>${college["Category"]}</span></p>
            <p><strong>Choice Code:</strong> <span><span class="choice-code">${college["Choice Code"] || 'N/A'}</span></span></p>
            <p><strong>Closing Percentile (Cutoff):</strong> <span>${cutoff}%</span></p>
            <p><strong>Admission Chance:</strong> <span><span class="${chanceClass}">${chance}</span></span></p>
        `;
        resultsDiv.appendChild(div);
    });
}

/**
 * Downloads the current results as a CSV file.
 */
function downloadCSV() {
    if (currentResults.length === 0) {
        alert("No results to download. Please predict colleges first.");
        return;
    }
    const userPercentile = parseFloat(document.getElementById('percentile').value) || 0;
    
    const headers = ["College Name", "Course Name", "Choice Code", "Category", "Closing Percentile", "Admission Chance"];
    
    const rows = currentResults.map(c => {
        const cutoff = c["Percent"];
        const difference = userPercentile - cutoff;
        let chance = 'Tough Chance';
        if (difference >= 3) chance = 'High Chance';
        else if (difference >= 0.5) chance = 'Medium Chance';

        return [
            `"${c["College Name"].replace(/"/g, '""')}"`,
            `"${c["Course Name"].replace(/"/g, '""')}"`,
            c["Choice Code"],
            c["Category"],
            cutoff,
            chance
        ];
    });

    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cetguru_mhtcet_colleges.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// === Event Listener ===
// This function will be called as soon as the page loads.
document.addEventListener('DOMContentLoaded', fetchMhtcetOptions);