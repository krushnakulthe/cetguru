// Global state for results
let currentJeeResults = [];

// DOM Elements
const branchSelect = document.getElementById('branch');
const roundSelect = document.getElementById('round'); // राऊंड ड्रॉपडाऊन
const resultsDiv = document.getElementById("results");

/**
 * Fetches JEE options (branches and rounds) from the backend.
 */
async function populateJeeOptions() {
    try {
        const response = await fetch("https://cet-guru-api.onrender.com/get-jee-options");
        if (!response.ok) throw new Error('Failed to load JEE options from server.');
        const jeeOptions = await response.json();
        
        // Populate Branches dropdown
        branchSelect.innerHTML = '<option value="">-- Select a Branch --</option>';
        (jeeOptions.branches || []).forEach(branch => {
            branchSelect.innerHTML += `<option value="${branch}">${branch}</option>`;
        });
        
        // Populate Rounds dropdown
        roundSelect.innerHTML = '<option value="AI">✨ AI Prediction (All Rounds)</option>';
        (jeeOptions.rounds || []).forEach(r => {
            roundSelect.innerHTML += `<option value="${r}">Round ${r}</option>`;
        });

    } catch (error) {
        branchSelect.innerHTML = '<option value="">Error loading branches</option>';
        roundSelect.innerHTML = '<option value="">Error loading rounds</option>';
        console.error("Error populating JEE options:", error);
    }
}

/**
 * Predicts colleges based on user input for JEE.
 */
async function predictJeeColleges() {
    const percentile = parseFloat(document.getElementById('percentile').value);
    const branch = branchSelect.value;
    const city = document.getElementById('city').value.trim();
    const round = roundSelect.value; // राऊंडची निवड मिळवली

    if (isNaN(percentile) || !branch || !round) {
        alert("Please enter your percentile, and select a branch and round.");
        return;
    }

    resultsDiv.innerHTML = `<div class="results-loading"><div class="spinner"></div><p>Finding the best colleges for you...</p></div>`;

    try {
        const response = await fetch("https://cet-guru-api.onrender.com/predict/jee", {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentile, branch, city, round }) // 'round' इथे पाठवला
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }
        
        const data = await response.json();
        currentJeeResults = data;
        displayJeeColleges(data);
    } catch (err) {
        resultsDiv.innerHTML = `<div class="no-results"><strong>Error:</strong> ${err.message}</div>`;
        console.error(err);
    }
}

/**
 * Displays the list of predicted JEE colleges.
 */
function displayJeeColleges(data) {
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
        const cutoff = college["Percentile"];
        const difference = userPercentile - cutoff;
        let chance = 'Tough Chance';
        let chanceClass = 'chance-low';
        if (difference >= 0.5) {
            chance = 'High Chance';
            chanceClass = 'chance-high';
        } else if (difference >= 0.1) {
            chance = 'Medium Chance';
            chanceClass = 'chance-medium';
        }

        const div = document.createElement("div");
        div.className = "college-card";
        
        div.innerHTML = `
            <strong class="college-title">${college["College Name"]}</strong>
            <p><strong>Branch:</strong> ${college["Course Name"]}</p>
            <div class="card-details-grid">
                <p><strong>Closing Rank:</strong> <span>${college["Closing Rank"] || 'N/A'}</span></p>
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
document.addEventListener('DOMContentLoaded', populateJeeOptions);