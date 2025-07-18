// DOM Elements
const catSelect = document.getElementById('category');
const resultsDiv = document.getElementById("results");

async function populateNursingCategories() {
    try {
        const response = await fetch("https://cet-guru-api.onrender.com/get-nursing-categories");
        if (!response.ok) throw new Error('Failed to load categories from server.');
        const categories = await response.json();

        catSelect.innerHTML = '<option value="">-- Select Category --</option>';
        categories.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    } catch (error) {
        console.error("Error fetching nursing categories:", error);
        catSelect.innerHTML = '<option value="">Error loading categories</option>';
    }
}

async function predictNursingColleges() {
    const percentile = parseFloat(document.getElementById('percentile').value);
    const category = catSelect.value;
    const city = document.getElementById('city').value.trim();

    if (isNaN(percentile) || !category) {
        alert("Please enter your percentile and select a category.");
        return;
    }

    resultsDiv.innerHTML = `<div class="results-loading"><div class="spinner"></div><p>Finding colleges for you...</p></div>`;

    try {
        const response = await fetch("https://cet-guru-api.onrender.com/predict/nursing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentile, category, city })
        });

        if (!response.ok) throw new Error((await response.json()).error || 'Server error');
        
        const data = await response.json();
        displayNursingColleges(data);
    } catch (err) {
        resultsDiv.innerHTML = `<div class="no-results"><strong>Error:</strong> ${err.message}</div>`;
    }
}

function displayNursingColleges(data) {
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

        // Admission Chance Logic (Nursing साठी आपण MHT-CET सारखेच निकष वापरू शकतो)
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
    <p><strong>College Code:</strong> <span>${college["College Code"] || 'N/A'}</span></p>
    <p><strong>Category:</strong> <span>${college["Category"]}</span></p>
    <p><strong>Closing Percentile (Cutoff):</strong> <span>${cutoff}%</span></p>
    <p><strong>Admission Chance:</strong> <span><span class="${chanceClass}">${chance}</span></span></p>
`;
        resultsDiv.appendChild(div);
    });
}
document.addEventListener('DOMContentLoaded', populateNursingCategories);