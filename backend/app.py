import os
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
import traceback

# Initialize Flask App
app = Flask(__name__)
CORS(app)

# --- Global variables for dataframes ---
mhtcet_data, jee_data, dse_data, nursing_data = None, None, None, None

# --- Data Loading and Cleaning Function ---
def load_data():
    """Loads and cleans all the CSV data into pandas DataFrames."""
    global mhtcet_data, jee_data, dse_data, nursing_data
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        # MHT-CET
        mhtcet_data = pd.read_csv(os.path.join(backend_dir, 'data', 'mhtcet_data.csv'))
        if mhtcet_data['Percent'].dtype == 'object':
            mhtcet_data['Percent'] = mhtcet_data['Percent'].astype(str).str.replace('%', '', regex=False)
        mhtcet_data['Percent'] = pd.to_numeric(mhtcet_data['Percent'], errors='coerce')
        mhtcet_data.dropna(subset=['Percent'], inplace=True)
        print("MHT-CET data loaded successfully!")
        # JEE
        jee_data = pd.read_csv(os.path.join(backend_dir, 'data', 'jee_data.csv'))
        jee_data['Percentile'] = pd.to_numeric(jee_data['Percentile'], errors='coerce')
        jee_data['Closing Rank'] = pd.to_numeric(jee_data['Closing Rank'], errors='coerce')
        jee_data.dropna(subset=['Percentile', 'Course Name'], inplace=True)
        print("JEE data loaded successfully!")
        # DSE
        dse_data = pd.read_csv(os.path.join(backend_dir, 'data', 'dse_data.csv'))
        if dse_data['Percent'].dtype == 'object':
            dse_data['Percent'] = dse_data['Percent'].astype(str).str.replace('%', '', regex=False)
        dse_data['Percent'] = pd.to_numeric(dse_data['Percent'], errors='coerce')
        dse_data.dropna(subset=['Percent'], inplace=True)
        print("DSE data loaded successfully!")
        # Nursing
        nursing_data = pd.read_csv(os.path.join(backend_dir, 'data', 'nursing_data.csv'))
        if nursing_data['Percent'].dtype == 'object':
            nursing_data['Percent'] = nursing_data['Percent'].astype(str).str.replace('%', '', regex=False)
        nursing_data['Percent'] = pd.to_numeric(nursing_data['Percent'], errors='coerce')
        nursing_data.dropna(subset=['Percent'], inplace=True)
        print("Nursing data loaded successfully!")
    except Exception as e:
        print(f"FATAL ERROR during data loading: {e}")

# --- AI Prediction Helper Function ---
def get_ai_prediction(df, percentile_col, user_percentile, group_cols):
    if df.empty or 'Round' not in df.columns: return pd.DataFrame()
    unique_key = ['College Name', 'Course Name']
    if 'Category' in df.columns: unique_key.append('Category')
    for col in group_cols:
        if col in df.columns: unique_key.append(col)
    best_chance_df = df.loc[df.groupby(unique_key)[percentile_col].idxmin()]
    prediction_df = best_chance_df[best_chance_df[percentile_col] <= user_percentile].copy()
    prediction_df['Round'] = prediction_df['Round'].astype(str) + " (Best Chance)"
    return prediction_df

# --- API Endpoints ---
@app.route('/get-mhtcet-options', methods=['GET'])
def get_mhtcet_options():
    if mhtcet_data is not None:
        try:
            rounds = pd.to_numeric(mhtcet_data['Round'], errors='coerce').dropna().unique()
            sorted_rounds = sorted([str(int(r)) for r in rounds])
            options = {
                "categories": {"PCM": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCM']['Category'].unique().tolist()),"PCB": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCB']['Category'].unique().tolist())},
                "branches": {"PCM": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCM']['Course Name'].unique().tolist()),"PCB": sorted(mhtcet_data[mhtcet_data['Group'] == 'PCB']['Course Name'].unique().tolist())},
                "rounds": sorted_rounds
            }
            return jsonify(options)
        except Exception as e: return jsonify({"error": f"Error in MHT-CET options: {e}"}), 500
    return jsonify({"error": "MHT-CET data not loaded"}), 500

@app.route('/predict/mhtcet', methods=['POST'])
def predict_mhtcet():
    if mhtcet_data is None: return jsonify({"error": "MHT-CET data not loaded."}), 500
    try:
        data = request.json
        user_percentile, group, category, branch, city, round_choice = (float(data.get('percentile', 0)), data.get('group'), data.get('category'), data.get('branch'), data.get('city', '').strip().lower(), data.get('round'))
        base_filtered_df = mhtcet_data[(mhtcet_data['Group'] == group) & (mhtcet_data['Category'] == category) & (mhtcet_data['Course Name'] == branch)].copy()
        if round_choice == "AI": filtered = get_ai_prediction(base_filtered_df, 'Percent', user_percentile, ['Group'])
        else: filtered = base_filtered_df[(base_filtered_df['Percent'] <= user_percentile) & (base_filtered_df['Round'].astype(str) == str(round_choice))].copy()
        if city: filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        return jsonify(filtered.sort_values(by='Percent', ascending=False).to_dict('records'))
    except Exception as e:
        print(f"--- ERROR in /predict/mhtcet: {traceback.format_exc()} ---")
        return jsonify({"error": "An unexpected server error occurred."}), 500

@app.route('/get-jee-options', methods=['GET'])
def get_jee_options():
    if jee_data is not None:
        try:
            branches = sorted(jee_data['Course Name'].dropna().unique().tolist())
            rounds = pd.to_numeric(jee_data['Round'], errors='coerce').dropna().unique()
            sorted_rounds = sorted([str(int(r)) for r in rounds])
            options = {"branches": branches, "rounds": sorted_rounds}
            return jsonify(options)
        except Exception as e: return jsonify({"error": f"Error in JEE options: {e}"}), 500
    return jsonify({"error": "JEE data not available"}), 500
    
@app.route('/predict/jee', methods=['POST'])
def predict_jee():
    if jee_data is None: return jsonify({"error": "JEE data not loaded."}), 500
    try:
        data = request.json
        user_percentile, branch, city, round_choice = (float(data.get('percentile', 0)), data.get('branch'), data.get('city', '').strip().lower(), data.get('round'))
        base_filtered_df = jee_data[jee_data['Course Name'] == branch].copy()
        if round_choice == "AI": filtered = get_ai_prediction(base_filtered_df, 'Percentile', user_percentile, [])
        else: filtered = base_filtered_df[(base_filtered_df['Percentile'] <= user_percentile) & (base_filtered_df['Round'].astype(str) == str(round_choice))].copy()
        if city: filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        return jsonify(filtered.sort_values(by='Percentile', ascending=False).to_dict('records'))
    except Exception as e:
        print(f"--- ERROR in /predict/jee: {traceback.format_exc()} ---")
        return jsonify({"error": "An unexpected server error occurred."}), 500

# === DSE Endpoints (हा भाग सुधारित आहे) ===
@app.route('/get-dse-options', methods=['GET'])
def get_dse_options():
    if dse_data is not None:
        try:
            eng_cat = sorted(dse_data[dse_data['Group'].str.lower() == 'eng']['Category'].unique().tolist())
            phy_cat = sorted(dse_data[dse_data['Group'].str.lower() == 'phy']['Category'].unique().tolist())
            eng_branch = sorted(dse_data[dse_data['Group'].str.lower() == 'eng']['Course Name'].unique().tolist())
            phy_branch = sorted(dse_data[dse_data['Group'].str.lower() == 'phy']['Course Name'].unique().tolist())
            
            # Eng आणि Phy साठी स्वतंत्रपणे राऊंडची यादी मिळवा
            eng_rounds_raw = pd.to_numeric(dse_data[dse_data['Group'].str.lower() == 'eng']['Round'], errors='coerce').dropna().unique()
            phy_rounds_raw = pd.to_numeric(dse_data[dse_data['Group'].str.lower() == 'phy']['Round'], errors='coerce').dropna().unique()
            eng_rounds = sorted([str(int(r)) for r in eng_rounds_raw])
            phy_rounds = sorted([str(int(r)) for r in phy_rounds_raw])

            options = {
                "categories": {"eng": eng_cat, "phy": phy_cat},
                "branches": {"eng": eng_branch, "phy": phy_branch},
                "rounds": {"eng": eng_rounds, "phy": phy_rounds} # <-- राऊंडची यादी ग्रुपनुसार विभागली
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
        user_percentile, group, category, branch, city, round_choice = (float(data.get('percentile', 0)), data.get('group'), data.get('category'), data.get('branch'), data.get('city', '').strip().lower(), data.get('round'))
        base_filtered_df = dse_data[(dse_data['Group'].str.lower() == group) & (dse_data['Category'] == category) & (dse_data['Course Name'] == branch)].copy()
        if round_choice == "AI": filtered = get_ai_prediction(base_filtered_df, 'Percent', user_percentile, ['Group'])
        else: filtered = base_filtered_df[(base_filtered_df['Percent'] <= user_percentile) & (base_filtered_df['Round'].astype(str) == str(round_choice))].copy()
        if city: filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        return jsonify(filtered.sort_values(by='Percent', ascending=False).to_dict('records'))
    except Exception as e:
        print(f"--- ERROR in /predict/dse: {traceback.format_exc()} ---")
        return jsonify({"error": "An unexpected server error occurred."}), 500

# --- Nursing Endpoints (यात बदल नाही) ---
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
        user_percentile, category, city = (float(data.get('percentile', 0)), data.get('category'), data.get('city', '').strip().lower())
        filtered = nursing_data[(nursing_data['Percent'] <= user_percentile) & (nursing_data['Category'] == category)].copy()
        if city:
            filtered = filtered[filtered['College Name'].str.lower().str.contains(city, na=False)]
        return jsonify(filtered.sort_values(by='Percent', ascending=False).to_dict('records'))
    except Exception as e:
        print(f"--- ERROR in /predict/nursing: {traceback.format_exc()} ---")
        return jsonify({"error": "An unexpected server error occurred."}), 500

# Load data when the application starts
load_data()

if __name__ == '__main__':
     app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))