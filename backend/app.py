# ... (Varche sarv import tashech theva) ...
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

# Initialize Flask App
app = Flask(__name__)
CORS(app)

# --- Global variables for dataframes ---
mhtcet_data = None
jee_data = None

# --- Data Loading and Cleaning Function ---
def load_data():
    """Loads and cleans the CSV data into pandas DataFrames."""
    global mhtcet_data, jee_data
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        
        # === MHT-CET Data Loading (ha bhag tasach theva) ===
        mhtcet_path = os.path.join(backend_dir, 'data', 'mhtcet_data.csv')
        temp_mhtcet_df = pd.read_csv(mhtcet_path)
        if 'Percent' in temp_mhtcet_df.columns:
            if temp_mhtcet_df['Percent'].dtype == 'object':
                temp_mhtcet_df['Percent'] = temp_mhtcet_df['Percent'].astype(str).str.replace('%', '', regex=False)
            temp_mhtcet_df['Percent'] = pd.to_numeric(temp_mhtcet_df['Percent'], errors='coerce')
            temp_mhtcet_df.dropna(subset=['Percent'], inplace=True)
            mhtcet_data = temp_mhtcet_df
            print("MHT-CET data loaded and cleaned successfully!")
        else:
            print("ERROR: 'Percent' column not found in mhtcet_data.csv")

        # === JEE Data Loading (फक्त हा भाग बदला) ===
        jee_path = os.path.join(backend_dir, 'data', 'jee_data.csv')
        temp_jee_df = pd.read_csv(jee_path)
        
        required_jee_cols = ['College Name', 'Course Name', 'Percentile', 'Closing Rank']
        if all(col in temp_jee_df.columns for col in required_jee_cols):
            temp_jee_df['Percentile'] = pd.to_numeric(temp_jee_df['Percentile'], errors='coerce')
            temp_jee_df['Closing Rank'] = pd.to_numeric(temp_jee_df['Closing Rank'], errors='coerce')
            
            # **[REMOVED]** City column extraction logic is removed. We will search directly in 'College Name'.
            # आपण आता 'City' नावाचा नवीन कॉलम तयार करणार नाही.

            temp_jee_df.dropna(subset=['Percentile', 'Course Name'], inplace=True)
            jee_data = temp_jee_df
            print("JEE data loaded and cleaned successfully! (Using direct search for city)")
        else:
            print("ERROR: One or more required columns are missing in jee_data.csv. Required: ", required_jee_cols)

    except FileNotFoundError as e:
        print(f"FATAL ERROR: {e}. Make sure the CSV files are in the 'backend/data/' directory.")
    except Exception as e:
        print(f"FATAL ERROR during data loading: {e}")

# ... (get_jee_branches and predict_mhtcet functions tashech theva) ...
@app.route('/get-jee-branches', methods=['GET'])
def get_jee_branches():
    """Returns a list of unique branch names from the JEE dataset."""
    if jee_data is not None and 'Course Name' in jee_data.columns:
        branches = sorted(jee_data['Course Name'].dropna().unique().tolist())
        return jsonify(branches)
    
    print("JEE Branch Error: jee_data is None or 'Course Name' column is missing.")
    return jsonify({"error": "JEE data not available or is malformed. Check server logs."}), 500

@app.route('/predict/mhtcet', methods=['POST'])
def predict_mhtcet():
    # हा कोड जसा आहे तसाच ठेवा
    if mhtcet_data is None:
        return jsonify({"error": "MHT-CET data not loaded. Check server logs."}), 500
    try:
        data = request.json
        user_percentile = float(data.get('percentile', 0))
        group = data.get('group')
        category = data.get('category')
        branch = data.get('branch')
        city = data.get('city', '').strip().lower()
        filtered = mhtcet_data.copy()
        filtered = filtered[
            (filtered['Percent'] <= user_percentile) &
            (filtered['Group'].astype(str) == str(group)) &
            (filtered['Category'].astype(str) == str(category)) &
            (filtered['Course Name'].astype(str) == str(branch))
        ]
        if city:
            filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        result = filtered.sort_values(by='Percent', ascending=False)
        return jsonify(result.to_dict('records'))
    except Exception as e:
        print(f"Error in /predict/mhtcet: {e}")
        return jsonify({"error": f"An error occurred during MHT-CET prediction: {e}"}), 400


# === /predict/jee फंक्शनमध्ये फक्त हा बदल करा ===
@app.route('/predict/jee', methods=['POST'])
def predict_jee():
    if jee_data is None:
        return jsonify({"error": "JEE data not loaded. Check server logs."}), 500

    try:
        data = request.json
        user_percentile = float(data.get('percentile', 0))
        branch = data.get('branch')
        city = data.get('city', '').strip().lower()

        filtered = jee_data.copy()
        
        # Basic filtering for percentile and branch
        filtered = filtered[
            (filtered['Percentile'] <= user_percentile) &
            (filtered['Course Name'].astype(str) == str(branch))
        ]

        # **[IMPROVED]** New flexible city filter logic
        # आता आपण थेट 'College Name' मध्येच शहर शोधू.
        if city:
            # `na=False` ensures that if a college name is empty, it doesn't cause an error.
            # `str.lower()` ensures the search is case-insensitive.
            filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        
        result = filtered.sort_values(by='Percentile', ascending=False)
        return jsonify(result.to_dict('records'))

    except Exception as e:
        print(f"Error in /predict/jee: {e}")
        return jsonify({"error": f"An error occurred during JEE prediction: {e}"}), 400


# Load data when the application starts
load_data()

if __name__ == '__main__':
     app.run(host='0.0.0.0', port=os.environ.get('PORT', 5000))
    #app.run(debug=True)
