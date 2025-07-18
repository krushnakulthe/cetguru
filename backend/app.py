import os
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

# Initialize Flask App
app = Flask(__name__)
CORS(app)

# --- Global variables for dataframes ---
mhtcet_data = None
jee_data = None
dse_data = None
nursing_data = None

# --- Data Loading and Cleaning Function ---
def load_data():
    """Loads and cleans all the CSV data into pandas DataFrames."""
    global mhtcet_data, jee_data, dse_data, nursing_data
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        
        # === MHT-CET Data Loading ===
        mhtcet_path = os.path.join(backend_dir, 'data', 'mhtcet_data.csv')
        temp_mhtcet_df = pd.read_csv(mhtcet_path)
        if 'Percent' in temp_mhtcet_df.columns:
            if temp_mhtcet_df['Percent'].dtype == 'object':
                temp_mhtcet_df['Percent'] = temp_mhtcet_df['Percent'].astype(str).str.replace('%', '', regex=False)
            temp_mhtcet_df['Percent'] = pd.to_numeric(temp_mhtcet_df['Percent'], errors='coerce')
            temp_mhtcet_df.dropna(subset=['Percent'], inplace=True)
            mhtcet_data = temp_mhtcet_df
            print("MHT-CET data loaded successfully!")

        # === JEE Data Loading ===
        jee_path = os.path.join(backend_dir, 'data', 'jee_data.csv')
        temp_jee_df = pd.read_csv(jee_path)
        required_jee_cols = ['College Name', 'Course Name', 'Percentile', 'Closing Rank']
        if all(col in temp_jee_df.columns for col in required_jee_cols):
            temp_jee_df['Percentile'] = pd.to_numeric(temp_jee_df['Percentile'], errors='coerce')
            temp_jee_df['Closing Rank'] = pd.to_numeric(temp_jee_df['Closing Rank'], errors='coerce')
            temp_jee_df.dropna(subset=['Percentile', 'Course Name'], inplace=True)
            jee_data = temp_jee_df
            print("JEE data loaded successfully!")
            
        # === Direct Second Year (DSE) Data Loading ===
        dse_path = os.path.join(backend_dir, 'data', 'dse_data.csv')
        temp_dse_df = pd.read_csv(dse_path)
        if 'Percent' in temp_dse_df.columns:
            if temp_dse_df['Percent'].dtype == 'object':
                 temp_dse_df['Percent'] = temp_dse_df['Percent'].astype(str).str.replace('%', '', regex=False)
            temp_dse_df['Percent'] = pd.to_numeric(temp_dse_df['Percent'], errors='coerce')
            temp_dse_df.dropna(subset=['Percent'], inplace=True)
            dse_data = temp_dse_df
            print("DSE data loaded successfully!")
            
        # === B.Sc. Nursing Data Loading ===
        nursing_path = os.path.join(backend_dir, 'data', 'nursing_data.csv')
        temp_nursing_df = pd.read_csv(nursing_path)
        if 'Percent' in temp_nursing_df.columns:
            if temp_nursing_df['Percent'].dtype == 'object':
                 temp_nursing_df['Percent'] = temp_nursing_df['Percent'].astype(str).str.replace('%', '', regex=False)
            temp_nursing_df['Percent'] = pd.to_numeric(temp_nursing_df['Percent'], errors='coerce')
            temp_nursing_df.dropna(subset=['Percent'], inplace=True)
            nursing_data = temp_nursing_df
            print("Nursing data loaded successfully!")

    except FileNotFoundError as e:
        print(f"FATAL ERROR: {e}. Make sure all CSV files are present in the 'backend/data/' directory.")
    except Exception as e:
        print(f"FATAL ERROR during data loading: {e}")

# --- API Endpoints ---

# --- Endpoints for MHT-CET ---
@app.route('/get-mhtcet-options', methods=['GET'])
def get_mhtcet_options():
    if mhtcet_data is not None:
        options = {
            "categories": {"PCM": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCM']['Category'].unique().tolist()),"PCB": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCB']['Category'].unique().tolist())},
            "branches": {"PCM": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCM']['Course Name'].unique().tolist()),"PCB": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCB']['Course Name'].unique().tolist())}
        }
        return jsonify(options)
    return jsonify({"error": "MHT-CET data not loaded"}), 500

@app.route('/predict/mhtcet', methods=['POST'])
def predict_mhtcet():
    if mhtcet_data is None: return jsonify({"error": "MHT-CET data not loaded."}), 500
    try:
        data = request.json
        user_percentile = float(data.get('percentile', 0))
        group, category, branch, city = data.get('group'), data.get('category'), data.get('branch'), data.get('city', '').strip().lower()
        
        filtered = mhtcet_data[
            (mhtcet_data['Percent'] <= user_percentile) & (mhtcet_data['Group'] == group) &
            (mhtcet_data['Category'] == category) & (mhtcet_data['Course Name'] == branch)
        ].copy()
        
        if city:
            filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        
        return jsonify(filtered.sort_values(by='Percent', ascending=False).to_dict('records'))
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 400

# --- Endpoints for JEE Main ---
@app.route('/get-jee-branches', methods=['GET'])
def get_jee_branches():
    if jee_data is not None:
        return jsonify(sorted(jee_data['Course Name'].dropna().unique().tolist()))
    return jsonify({"error": "JEE data not available"}), 500
    
@app.route('/predict/jee', methods=['POST'])
def predict_jee():
    if jee_data is None: return jsonify({"error": "JEE data not loaded."}), 500
    try:
        data = request.json
        user_percentile, branch, city = float(data.get('percentile', 0)), data.get('branch'), data.get('city', '').strip().lower()
        
        filtered = jee_data[
            (jee_data['Percentile'] <= user_percentile) & (jee_data['Course Name'] == branch)
        ].copy()
        
        if city:
            filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        
        return jsonify(filtered.sort_values(by='Percentile', ascending=False).to_dict('records'))
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 400

# --- Endpoints for Direct Second Year (DSE) ---
@app.route('/get-dse-options', methods=['GET'])
def get_dse_options():
    if dse_data is not None:
        try:
            # Case-insensitive filtering for group names
            eng_cat = sorted(dse_data[dse_data['Group'].str.lower() == 'eng']['Category'].unique().tolist())
            phy_cat = sorted(dse_data[dse_data['Group'].str.lower() == 'phy']['Category'].unique().tolist())
            eng_branch = sorted(dse_data[dse_data['Group'].str.lower() == 'eng']['Course Name'].unique().tolist())
            phy_branch = sorted(dse_data[dse_data['Group'].str.lower() == 'phy']['Course Name'].unique().tolist())

            options = {
                "categories": {"eng": eng_cat, "phy": phy_cat},
                "branches": {"eng": eng_branch, "phy": phy_branch}
            }
            return jsonify(options)
        except Exception as e:
            return jsonify({"error": f"Failed to retrieve DSE options: {e}"}), 500
    return jsonify({"error": "DSE data not loaded"}), 500

@app.route('/predict/dse', methods=['POST'])
def predict_dse():
    if dse_data is None: return jsonify({"error": "DSE data not loaded."}), 500
    try:
        data = request.json
        user_percentile, group, category, branch, city = float(data.get('percentile', 0)), data.get('group'), data.get('category'), data.get('branch'), data.get('city', '').strip().lower()
        
        filtered = dse_data[
            (dse_data['Percent'] <= user_percentile) & (dse_data['Group'].str.lower() == group) &
            (dse_data['Category'] == category) & (dse_data['Course Name'] == branch)
        ].copy()
        
        if city:
            filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        
        return jsonify(filtered.sort_values(by='Percent', ascending=False).to_dict('records'))
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 400

# --- Endpoints for B.Sc. Nursing ---
@app.route('/get-nursing-categories', methods=['GET'])
def get_nursing_categories():
    if nursing_data is not None:
        return jsonify(sorted(nursing_data['Category'].unique().tolist()))
    return jsonify({"error": "Nursing data not available"}), 500

@app.route('/predict/nursing', methods=['POST'])
def predict_nursing():
    if nursing_data is None: return jsonify({"error": "Nursing data not loaded."}), 500
    try:
        data = request.json
        user_percentile, category, city = float(data.get('percentile', 0)), data.get('category'), data.get('city', '').strip().lower()

        filtered = nursing_data[
            (nursing_data['Percent'] <= user_percentile) & (nursing_data['Category'] == category)
        ].copy()
        
        if city:
            filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        
        return jsonify(filtered.sort_values(by='Percent', ascending=False).to_dict('records'))
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 400

# Load data when the application starts
load_data()

if __name__ == '__main__':
     app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))