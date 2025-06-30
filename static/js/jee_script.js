// Global state for results
let currentJeeResults = [];

// DOM Elements
const branchSelect = document.getElementById('branch');
const resultsDiv = document.getElementById("results");

/**
 * Fetches the list of unique JEE branches from the backend and populates the dropdown.
 */
async function populateJeeBranches() {
    try {
        const response = await fetch("https://cet-guru-api.onrender.com/get-jee-branches");
        if (!response.ok) {
            throw new Error('Failed to load branches from the server.');
        }
        const branches = await response.json();
        
        branchSelect.innerHTML = '<option value="">-- Select a Branch --</option>'; // Default option
        branches.forEach(branch => {
            branchSelect.innerHTML += `<option value="${branch}">${branch}</option>`;
        });

    } catch (error) {
        branchSelect.innerHTML = '<option value="">Error loading branches</option>';
        console.error("Error populating JEE branches:", error);
    }
}

/**
 * Predicts colleges based on user input for JEE.
 */
async function predictJeeColleges() {
    const percentile = parseFloat(document.getElementById('percentile').value);
    const branch = branchSelect.value;
    const city = document.getElementById('city').value.trim();

    // Validation check
    if (isNaN(percentile) || !branch) {
        alert("Please enter your percentile and select a branch.");
        return;
    }

    // Show professional loading animation
    resultsDiv.innerHTML = `
        <div class="results-loading">
            <div class="spinner"></div>
            <p>Finding the best colleges for you...</p>
        </div>
    `;

    try {
        const response = await fetch("https://cet-guru-api.onrender.com/predict/jee", {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentile, branch, city }) 
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        const data = await response.json();
        currentJeeResults = data; // Store results if needed elsewhere
        displayJeeColleges(data);

    } catch (err) {
        // Show professional error message
        resultsDiv.innerHTML = `<div class="no-results"><strong>Error:</strong> Could not connect to the prediction server. <br>Details: ${err.message}</div>`;
        console.error(err);
    }
}

/**
 * Displays the list of predicted JEE colleges.
 */
function displayJeeColleges(data) {
    resultsDiv.innerHTML = ''; // Clear loading animation

    const userPercentile = parseFloat(document.getElementById('percentile').value);

    if (data.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results"><p>No matching colleges found for your criteria. Try adjusting the filters.</p></div>';
    } else {
        // Create a header for the results
        const resultHeader = document.createElement('h3');
        resultHeader.textContent = `Found ${data.length} potential colleges for you:`;
        resultsDiv.appendChild(resultHeader);

        // Display each college card
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
                <strong>${college["College Name"]}</strong>
                <p><strong>Branch:</strong> ${college["Course Name"]}</p>
                <p><strong>Choice Code:</strong> <span class="choice-code">${college["Choice Code"] || 'N/A'}</span></p>
                <p><strong>Closing Percentile (Cutoff):</strong> ${cutoff}%</p>
                <p><strong>Closing Rank (Cutoff):</strong> ${college["Closing Rank"] || 'N/A'}</p>
                <p><strong>Admission Chance:</strong> <span class="${chanceClass}">${chance}</span></p>
            `;
            resultsDiv.appendChild(div);
        });
    }
}

// === Event Listener ===
// This function will be called as soon as the page loads.
document.addEventListener('DOMContentLoaded', populateJeeBranches);