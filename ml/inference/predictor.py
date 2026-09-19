import os
import joblib
import numpy as np

class MLPredictor:
    def __init__(self):
        base = r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/ml/models'
        self.rf_path = os.path.join(base, 'maintenance_risk_rf.joblib')
        self.iso_path = os.path.join(base, 'anomaly_detector_iso.joblib')
        self.rf_model = None
        self.iso_model = None
        self._load()

    def _load(self):
        if os.path.exists(self.rf_path):
            try:
                self.rf_model = joblib.load(self.rf_path)
            except Exception:
                pass
        if os.path.exists(self.iso_path):
            try:
                self.iso_model = joblib.load(self.iso_path)
            except Exception:
                pass

    def predict_maintenance_risk(self, age: int, mileage: int, months_since_srv: int, km_since_srv: int, anomalies: int) -> float:
        if self.rf_model:
            features = np.array([[age, mileage, months_since_srv, km_since_srv, anomalies]])
            return float(self.rf_model.predict_proba(features)[0][1])
        return min(0.95, round(0.1 + (age * 0.04) + (km_since_srv / 25000.0 * 0.3) + (anomalies * 0.2), 2))

    def detect_record_anomaly(self, age: int, mileage: int, months_since_srv: int, km_since_srv: int, anomalies: int) -> bool:
        if self.iso_model:
            features = np.array([[age, mileage, months_since_srv, km_since_srv, anomalies]])
            pred = self.iso_model.predict(features)[0]
            return pred == -1
        return anomalies > 0
