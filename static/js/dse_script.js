// Global variable to store DSE options
let dseOptions = {
    categories: { eng: [], phy: [] },
    branches: { eng: [], phy: [] }
};

// DOM Elements
const groupSelect = document.getElementById('group');
const catSelect = document.getElementById('category');
const branchSelect = document.getElementById('branch');
const resultsDiv = document.getElementById("results");

async function fetchDseOptions() {
    try {
        const response = await fetch("https://cet-guru-api.onrender.com/get-dse-options");
        if (!response.ok) throw new Error('Failed to load DSE options from server.');
        dseOptions = await response.json();
        filterDseOptions();
    } catch (error) {
        console.error("Error fetching DSE options:", error);
        catSelect.innerHTML = '<option value="">Error loading categories</option>';
        branchSelect.innerHTML = '<option value="">Error loading branches</option>';
    }
}

function filterDseOptions() {
    const selectedGroup = groupSelect.value;
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    branchSelect.innerHTML = '<option value="">-- Select Branch --</option>';
    (dseOptions.categories[selectedGroup] || []).forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    (dseOptions.branches[selectedGroup] || []).forEach(b => branchSelect.innerHTML += `<option value="${b}">${b}</option>`);
}

async function predictDseColleges() {
    const percentile = parseFloat(document.getElementById('percentile').value);
    const group = groupSelect.value;
    const category = catSelect.value;
    const branch = branchSelect.value;
    const city = document.getElementById('city').value.trim();

    if (isNaN(percentile) || !category || !branch) {
        alert("Please enter your percentage and select all required options.");
        return;
    }

    resultsDiv.innerHTML = `<div class="results-loading"><div class="spinner"></div><p>Finding colleges for you...</p></div>`;

    try {
        const response = await fetch("https://cet-guru-api.onrender.com/predict/dse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentile, group, category, branch, city })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Server error');
        
        const data = await response.json();
        displayDseColleges(data);
    } catch (err) {
        resultsDiv.innerHTML = `<div class="no-results"><strong>Error:</strong> ${err.message}</div>`;
    }
}

function displayDseColleges(data) {
    resultsDiv.innerHTML = '';
    const userPercentile = parseFloat(document.getElementById('percentile').value);

    if (data.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results"><p>No matching colleges found for your criteria.</p></div>';
        return;
    }
    
    const resultHeader = document.createElement('h3');
    resultHeader.textContent = `Found ${data.length} potential colleges for you:`;
    resultsDiv.appendChild(resultHeader);

    data.forEach(college => {
        const cutoff = college["Percent"];
        const difference = userPercentile - cutoff;
        
        // Admission Chance Logic
        let chance = 'Tough Chance';
        let chanceClass = 'chance-low';

        if (difference >= 3) { // 3% पेक्षा जास्त फरक असेल तर High
            chance = 'High Chance';
            chanceClass = 'chance-high';
        } else if (difference >= 0.5) { // 0.5% ते 3% फरक असेल तर Medium
            chance = 'Medium Chance';
            chanceClass = 'chance-medium';
        }
        // अन्यथा Tough Chance राहील

        const div = document.createElement("div");
        div.className = "college-card";
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


document.addEventListener('DOMContentLoaded', fetchDseOptions);