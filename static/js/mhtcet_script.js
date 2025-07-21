// Global variable to store options fetched from the backend
let mhtcetOptions = {
    categories: { PCM: [], PCB: [] },
    branches: { PCM: [], PCB: [] },
    rounds: [] // राऊंडसाठी नवीन जागा
};

// DOM Elements
const groupSelect = document.getElementById('group');
const catSelect = document.getElementById('category');
const branchSelect = document.getElementById('branch');
const roundSelect = document.getElementById('round'); // राऊंड ड्रॉपडाऊनसाठी नवीन व्हेरिएबल
const resultsDiv = document.getElementById("results");
let currentResults = [];

/**
 * Fetches MHT-CET options (categories, branches, rounds) from the backend.
 */
async function fetchMhtcetOptions() {
    try {
        const response = await fetch("https://cet-guru-api.onrender.com/get-mhtcet-options");
        if (!response.ok) {
            throw new Error('Failed to load MHT-CET options from server.');
        }
        mhtcetOptions = await response.json();
        
        // Populate Rounds dropdown first
        roundSelect.innerHTML = '<option value="AI">✨ AI Prediction (All Rounds)</option>';
        (mhtcetOptions.rounds || []).forEach(r => {
            roundSelect.innerHTML += `<option value="${r}">Round ${r}</option>`;
        });

        // Populate other dropdowns for the first time
        filterOptions(); 
    } catch (error) {
        console.error("Error fetching MHT-CET options:", error);
        catSelect.innerHTML = '<option value="">Error loading categories</option>';
        branchSelect.innerHTML = '<option value="">Error loading branches</option>';
        roundSelect.innerHTML = '<option value="">Error loading rounds</option>';
    }
}

/**
 * Populates category and branch dropdowns based on the selected group.
 */
function filterOptions() {
    const selectedGroup = groupSelect.value;
    
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    branchSelect.innerHTML = '<option value="">-- Select Branch --</option>';

    const categoriesForGroup = mhtcetOptions.categories[selectedGroup] || [];
    categoriesForGroup.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);

    const branchesForGroup = mhtcetOptions.branches[selectedGroup] || [];
    branchesForGroup.forEach(b => branchSelect.innerHTML += `<option value="${b}">${b}</option>`);
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
    const round = roundSelect.value; // राऊंडची निवड मिळवली

    if (isNaN(percentile) || !category || !branch || !round) {
        alert("Please enter your percentile and select all required options.");
        return;
    }

    resultsDiv.innerHTML = `<div class="results-loading"><div class="spinner"></div><p>Finding the best colleges for you...</p></div>`;

    try {
        const response = await fetch("https://cet-guru-api.onrender.com/predict/mhtcet", {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentile, group, category, branch, city, round }) // 'round' इथे पाठवला
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        const data = await response.json();
        currentResults = data;
        displayColleges(data);

    } catch (err) {
        resultsDiv.innerHTML = `<div class="no-results"><strong>Error:</strong> ${err.message}</div>`;
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
        
        // निकालांमध्ये राऊंडची माहिती दाखवली
        div.innerHTML = `
            <strong class="college-title">${college["College Name"]}</strong>
            <p><strong>College Code:</strong> ${college["College Code"] || 'N/A'}</p>
            <p><strong>Branch:</strong> ${college["Course Name"]}</p>
            <div class="card-details-grid">
                <p><strong>Category:</strong> <span>${college["Category"]}</span></p>
                <p><strong>Round:</strong> <span>${college["Round"] || 'N/A'}</span></p>
            </div>
            <p><strong>Choice Code:</strong> <span class="choice-code">${college["Choice Code"] || 'N/A'}</span></p>
            <p><strong>Closing Percentile (Cutoff):</strong> ${cutoff}%</p>
            <p><strong>Admission Chance:</strong> <span class="${chanceClass}">${chance}</span></p>
        `;
        resultsDiv.appendChild(div);
    });
}

// === Event Listener ===
document.addEventListener('DOMContentLoaded', fetchMhtcetOptions);