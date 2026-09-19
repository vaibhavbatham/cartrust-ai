import os
import json
import datetime
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

np.random.seed(42)

ml_base = r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/ml'
models_dir = os.path.join(ml_base, 'models')
eval_dir = os.path.join(ml_base, 'evaluation')

def train_models():
    print('Generating synthetic training features for Maintenance Risk & Record Anomaly...')
    n_samples = 2500

    ages = np.random.randint(1, 15, size=n_samples)
    mileage = ages * np.random.randint(8000, 18000, size=n_samples) + np.random.randint(0, 5000, size=n_samples)
    months_since_service = np.random.randint(1, 36, size=n_samples)
    km_since_service = months_since_service * np.random.randint(600, 1500, size=n_samples)
    anomalies = np.random.choice([0, 1, 2], size=n_samples, p=[0.8, 0.15, 0.05])

    X = np.column_stack([ages, mileage, months_since_service, km_since_service, anomalies])
    y_prob = 0.1 + (ages * 0.03) + (km_since_service / 30000.0 * 0.4) + (anomalies * 0.2)
    y = (y_prob > 0.45).astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print('Training Model A: Maintenance Risk Estimator (Random Forest)...')
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    rf_model.fit(X_train, y_train)

    y_pred = rf_model.predict(X_test)
    y_pred_proba = rf_model.predict_proba(X_test)[:, 1]

    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)

    print(f'Model A Evaluation -> Precision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}, ROC-AUC: {roc_auc:.3f}')

    print('Training Model B: Vehicle Record Anomaly Detector (Isolation Forest)...')
    iso_model = IsolationForest(contamination=0.05, random_state=42)
    iso_model.fit(X_train)

    joblib.dump(rf_model, os.path.join(models_dir, 'maintenance_risk_rf.joblib'))
    joblib.dump(iso_model, os.path.join(models_dir, 'anomaly_detector_iso.joblib'))

    metrics = {
        'training_date': datetime.datetime.utcnow().isoformat(),
        'model_a': {
            'name': 'MaintenanceRiskEstimator',
            'algorithm': 'RandomForestClassifier',
            'version': '1.0.0',
            'n_samples': n_samples,
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4),
            'roc_auc': round(roc_auc, 4)
        },
        'model_b': {
            'name': 'RecordAnomalyDetector',
            'algorithm': 'IsolationForest',
            'version': '1.0.0',
            'contamination': 0.05
        }
    }
    with open(os.path.join(eval_dir, 'metrics.json'), 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2)

    print('ML models trained and evaluation metrics persisted successfully!')

if __name__ == '__main__':
    train_models()
