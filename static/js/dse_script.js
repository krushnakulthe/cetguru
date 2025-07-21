// Global variable to store DSE options
let dseOptions = {
    categories: { eng: [], phy: [] },
    branches: { eng: [], phy: [] },
    rounds: { eng: [], phy: [] } // राऊंडची रचना अशीच ठेवा
};

// DOM Elements
const groupSelect = document.getElementById('group');
const catSelect = document.getElementById('category');
const branchSelect = document.getElementById('branch');
const roundSelect = document.getElementById('round');
const resultsDiv = document.getElementById("results");

async function fetchDseOptions() {
    try {
        // तुमच्या लोकल टेस्टिंगसाठी http://127.0.0.1:5000 वापरा
        // लाइव्ह झाल्यावर https://cet-guru-api.onrender.com वापरा
        const response = await fetch("https://cet-guru-api.onrender.com/get-dse-options");
        if (!response.ok) throw new Error('Failed to load DSE options from server.');
        dseOptions = await response.json();
        
        // सुरुवातीला पेज लोड झाल्यावर एकदा सर्व ड्रॉपडाऊन भरा
        filterDseOptions(); 
    } catch (error) {
        console.error("Error fetching DSE options:", error);
        catSelect.innerHTML = '<option value="">Error loading categories</option>';
        branchSelect.innerHTML = '<option value="">Error loading branches</option>';
        roundSelect.innerHTML = '<option value="">Error loading rounds</option>';
    }
}

// हा फंक्शन आता राऊंडची यादी सुद्धा बरोबर अपडेट करेल
function filterDseOptions() {
    const selectedGroup = groupSelect.value;
    
    // Clear previous options for all dependent dropdowns
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    branchSelect.innerHTML = '<option value="">-- Select Branch --</option>';
    roundSelect.innerHTML = '<option value="AI">✨ AI Prediction (All Rounds)</option>'; // AI पर्याय नेहमी ठेवा

    // Populate Category dropdown based on selected group
    (dseOptions.categories[selectedGroup] || []).forEach(c => {
        catSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Populate Branch dropdown based on selected group
    (dseOptions.branches[selectedGroup] || []).forEach(b => {
        branchSelect.innerHTML += `<option value="${b}">${b}</option>`;
    });

    // Populate Rounds dropdown based on selected group
    (dseOptions.rounds[selectedGroup] || []).forEach(r => {
        roundSelect.innerHTML += `<option value="${r}">Round ${r}</option>`;
    });
}

async function predictDseColleges() {
    const percentile = parseFloat(document.getElementById('percentile').value);
    const group = groupSelect.value;
    const category = catSelect.value;
    const branch = branchSelect.value;
    const city = document.getElementById('city').value.trim();
    const round = roundSelect.value;

    if (isNaN(percentile) || !category || !branch || !round) {
        alert("Please enter your percentage and select all required options.");
        return;
    }

    resultsDiv.innerHTML = `<div class="results-loading"><div class="spinner"></div><p>Finding colleges for you...</p></div>`;

    try {
        const response = await fetch("https://cet-guru-api.onrender.com/predict/dse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentile, group, category, branch, city, round })
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
        div.innerHTML = `
            <strong class="college-title">${college["College Name"]}</strong>
            <p><strong>College Code:</strong> ${college["College Code"] || 'N/A'}</p>
            <p><strong>Branch:</strong> ${college["Course Name"]}</p>
            <div class="card-details-grid">
                <p><strong>Category:</strong> <span>${college["Category"]}</span></p>
                <p><strong>Round:</strong> <span>${college["Round"] || 'N/A'}</span></p>
            </div>
            <p><strong>Choice Code:</strong> <span class="choice-code">${college["Choice Code"] || 'N/A'}</span></p>
            <p><strong>Closing Percent (Cutoff):</strong> ${cutoff}%</p>
            <p><strong>Admission Chance:</strong> <span class="${chanceClass}">${chance}</span></p>
        `;
        resultsDiv.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', fetchDseOptions);