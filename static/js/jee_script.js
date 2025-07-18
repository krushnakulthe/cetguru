// ... (varil sarv code tasach theva) ...
let currentJeeResults = [];
const branchSelect = document.getElementById('branch');
const resultsDiv = document.getElementById("results");

async function populateJeeBranches() {
    // ... (ha function jsa ahe tsa theva)
    try {
        const response = await fetch("https://cet-guru-api.onrender.com/get-jee-branches");
        if (!response.ok) throw new Error('Failed to load branches.');
        const branches = await response.json();
        branchSelect.innerHTML = '<option value="">-- Select a Branch --</option>';
        branches.forEach(branch => {
            branchSelect.innerHTML += `<option value="${branch}">${branch}</option>`;
        });
    } catch (error) {
        branchSelect.innerHTML = '<option value="">Error loading branches</option>';
        console.error("Error populating JEE branches:", error);
    }
}

async function predictJeeColleges() {
    // ... (ha function jsa ahe tsa theva)
    const percentile = parseFloat(document.getElementById('percentile').value);
    const branch = branchSelect.value;
    const city = document.getElementById('city').value.trim();

    if (!percentile || !branch) {
        alert("Please enter your percentile and select a branch.");
        return;
    }
    resultsDiv.innerHTML = '<p>🚀 Finding the best colleges for you based on JEE scores...</p>';
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
        currentJeeResults = data;
        displayJeeColleges(data);
    } catch (err) {
        resultsDiv.innerHTML = `<p style='color:red;'><strong>Error:</strong> Could not connect to the prediction server. Details: ${err.message}</p>`;
        console.error(err);
    }
}


// === फक्त हा फंक्शन बदला / Update only this function ===
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
        // --- ही रचना महत्त्वाची आहे ---
        div.innerHTML = `
            <strong class="college-title">${college["College Name"]}</strong>
            <p><strong>Branch:</strong> <span>${college["Course Name"]}</span></p>
            <p><strong>Choice Code:</strong> <span><span class="choice-code">${college["Choice Code"] || 'N/A'}</span></span></p>
            <p><strong>Closing Percentile (Cutoff):</strong> <span>${cutoff}%</span></p>
            <p><strong>Closing Rank (Cutoff):</strong> <span>${college["Closing Rank"] || 'N/A'}</span></p>
            <p><strong>Admission Chance:</strong> <span><span class="${chanceClass}">${chance}</span></span></p>
        `;
        resultsDiv.appendChild(div);
    });
}


// ... (downloadJeeCSV() function tasach theva) ...
function downloadJeeCSV() {
    if (currentJeeResults.length === 0) {
        alert("No results to download. Please predict colleges first.");
        return;
    }
    const userPercentile = parseFloat(document.getElementById('percentile').value);
    
    // Add "Admission Chance" to headers
    const headers = ["College Name", "Course Name", "Choice Code", "Closing Percentile", "Closing Rank", "Admission Chance"];
    
    const rows = currentJeeResults.map(c => {
        const cutoff = c["Percentile"];
        const difference = userPercentile - cutoff;
        let chance = 'Tough Chance';
        if (difference >= 0.5) chance = 'High Chance';
        else if (difference >= 0.1) chance = 'Medium Chance';
        
        return [
            `"${c["College Name"].replace(/"/g, '""')}"`,
            `"${c["Course Name"].replace(/"/g, '""')}"`,
            c["Choice Code"],
            cutoff,
            c["Closing Rank"] || 'N/A',
            chance
        ];
    });

    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cetguru_jee_colleges.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', populateJeeBranches);