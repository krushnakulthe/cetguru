// ... (varil sarv code tasach theva) ...
const categories = {
    PCM: ["GOPEN", "GSC", "GNTB", "GOBC", "LOPEN", "LST", "LOBC", "EWS", "DEF-O", "DEFR-OBC", "GNTA", "GNTC", "GNTD", "LNTA", "LNTB", "LNTC", "LNTD", "MI", "PWD-O", "PWDR-OBC", "PWDR-SC"],
    PCB: ["GSCH", "GSTH", "GOBCH", "LOPENH", "LVJH", "LNT2H", "LOBCH", "PWDOPENH", "GSCO", "GNT3O", "GOBCO", "LOPENO", "LSTO", "DEFROBCS", "EWS", "GVJH", "GNT1H", "GNT2H", "GNT3H", "LSCH", "LSTH", "PWDROBCH"]
};
const branches = {
    PCM: ["Civil Engineering", "Computer Science and Engineering", "Aeronautical Engineering", "Artificial Intelligence", "Artificial Intelligence and Data Science", "Automation and Robotics", "Automobile Engineering", "Chemical Engineering", "Computer Engineering", "Cyber Security", "Data Science", "Electrical Engineering", "Electronics and Telecommunication Engg", "Electronics Engineering", "Information Technology", "Mechanical Engineering", "Mechatronis Engineering", "Robotics", "Textile Technology"],
    PCB: ["Pharm D ( Doctor of Pharmacy)", "Pharmacy"]
};
const groupSelect = document.getElementById('group');
const catSelect = document.getElementById('category');
const branchSelect = document.getElementById('branch');
let currentResults = [];

function filterOptions() {
    const group = groupSelect.value;
    catSelect.innerHTML = '';
    branchSelect.innerHTML = '';
    const catsForGroup = categories[group] || [];
    const branchesForGroup = branches[group] || [];
    catsForGroup.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    branchesForGroup.forEach(b => branchSelect.innerHTML += `<option value="${b}">${b}</option>`);
}

async function predictColleges() {
    // ... (ha function jsa ahe tsa theva)
    const percentile = parseFloat(document.getElementById('percentile').value);
    const group = document.getElementById('group').value;
    const category = document.getElementById('category').value;
    const branch = document.getElementById('branch').value;
    const city = document.getElementById('city').value.trim();
    const resultsDiv = document.getElementById("results");

    if (isNaN(percentile)) {
        alert("Please enter a valid percentile.");
        return;
    }

    resultsDiv.innerHTML = '<p>🚀 Finding the best colleges for you...</p>';

    try {
        const response = await fetch("http://127.0.0.1:5000/predict/mhtcet", {
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
        resultsDiv.innerHTML = `<p style='color:red;'><strong>Error:</strong> Could not get prediction. Please check the backend server logs for more details. Error: ${err.message}</p>`;
        console.error(err);
    }
}


// === फक्त हा फंक्शन बदला / Update only this function ===
function displayColleges(data) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = ''; // Clear previous results
    
    // Get user's percentile to calculate admission chance
    const userPercentile = parseFloat(document.getElementById('percentile').value);

    if (data.length === 0) {
        resultsDiv.innerHTML = '<p>No matching colleges found. Try adjusting your filters or checking a slightly lower percentile.</p>';
    } else {
        resultsDiv.innerHTML = `<h3>Found ${data.length} potential colleges for you:</h3>`;
        data.forEach(college => {
            const cutoff = college["Percent"];
            const difference = userPercentile - cutoff;
            
            let chance = '';
            let chanceClass = '';

            if (difference >= 3) {
                chance = 'High Chance';
                chanceClass = 'chance-high'; // Green color
            } else if (difference >= 0.5) {
                chance = 'Medium Chance';
                chanceClass = 'chance-medium'; // Orange color
            } else {
                chance = 'Tough Chance';
                chanceClass = 'chance-low'; // Red color
            }

            const div = document.createElement("div");
            div.className = "college-card";
            div.innerHTML = `
                <strong>${college["College Name"]}</strong>
                <p><strong>Branch:</strong> ${college["Course Name"]}</p>
                <p><strong>Category:</strong> ${college["Category"]}</p>
                <p><strong>Choice Code:</strong> <span class="choice-code">${college["Choice Code"]}</span></p>
                <p><strong>Closing Percentile (Cutoff):</strong> ${cutoff}%</p>
                <p><strong>Admission Chance:</strong> <span class="${chanceClass}">${chance}</span></p>
            `;
            resultsDiv.appendChild(div);
        });
    }
}

// ... (downloadCSV() function tasach theva) ...
function downloadCSV() {
    if (currentResults.length === 0) {
        alert("No results to download. Please predict colleges first.");
        return;
    }
    const userPercentile = parseFloat(document.getElementById('percentile').value);
    
    // Add "Admission Chance" to headers
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

document.addEventListener('DOMContentLoaded', filterOptions);