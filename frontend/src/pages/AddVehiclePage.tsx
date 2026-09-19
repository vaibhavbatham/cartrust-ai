import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth, formatErrorMessage } from '../contexts/AuthContext';
import {
  Car,
  Plus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Fuel,
  Settings,
  Gauge,
  MapPin,
  IndianRupee,
  FileText,
  Image as ImageIcon,
  ArrowRight
} from 'lucide-react';

const POPULAR_MAKES = [
  'Honda',
  'Maruti Suzuki',
  'Hyundai',
  'Tata Motors',
  'Mahindra',
  'Toyota',
  'Kia',
  'Volkswagen',
  'Skoda',
  'MG',
  'Renault',
  'BMW',
  'Mercedes-Benz',
  'Audi'
];

const MAKE_MODELS: Record<string, string[]> = {
  'Honda': ['City', 'Amaze', 'Elevate', 'Civic', 'Jazz', 'WR-V', 'CR-V'],
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Grand Vitara', 'Fronx', 'Wagon R'],
  'Hyundai': ['Creta', 'Venue', 'i20', 'Grand i10 Nios', 'Verna', 'Tucson', 'Alcazar', 'Exter'],
  'Tata Motors': ['Nexon', 'Punch', 'Harrier', 'Safari', 'Tiago', 'Altroz', 'Tigor'],
  'Mahindra': ['Thar', 'Scorpio-N', 'Scorpio Classic', 'XUV700', 'XUV300', 'Bolero', 'XUV400 EV'],
  'Toyota': ['Innova Crysta', 'Innova Hycross', 'Fortuner', 'Urban Cruiser Hyryder', 'Glanza', 'Camry'],
  'Kia': ['Seltos', 'Sonet', 'Carens', 'EV6', 'Carnival']
};

export const AddVehiclePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    registration_number: '',
    make: 'Honda',
    model: 'City',
    variant: 'VX Manual',
    year: 2021,
    registration_year: 2021,
    fuel_type: 'Petrol',
    transmission: 'Manual',
    current_odometer: 35000,
    mileage_efficiency: '17.8 km/l',
    engine_details: '1498 cc, 4-Cylinder i-VTEC, 119 bhp',
    ownership_status: 'FIRST',
    price: 850000,
    location: user?.profile?.city ? `${user.profile.city}, ${user.profile.state || 'India'}` : 'Bhopal, Madhya Pradesh',
    rc_number: '',
    vin: '',
    image_url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop&q=60'
  });

  const [plateCheck, setPlateCheck] = useState<{
    checking: boolean;
    valid: boolean | null;
    exists: boolean | null;
    normalized: string;
    message: string;
  }>({
    checking: false,
    valid: null,
    exists: null,
    normalized: '',
    message: ''
  });

  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Live registration number normalization and validation debouncing
  useEffect(() => {
    const raw = formData.registration_number.trim();
    if (!raw) {
      setPlateCheck({ checking: false, valid: null, exists: null, normalized: '', message: '' });
      return;
    }

    const norm = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setPlateCheck(prev => ({ ...prev, normalized: norm, checking: true }));

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/vehicles/validate-plate/${encodeURIComponent(raw)}`);
        setPlateCheck({
          checking: false,
          valid: res.data.is_valid,
          exists: res.data.exists,
          normalized: res.data.normalized_plate,
          message: res.data.message
        });
      } catch {
        setPlateCheck(prev => ({ ...prev, checking: false }));
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.registration_number]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'registration_year' || name === 'current_odometer' || name === 'price'
        ? Number(value) || 0
        : value
    }));
  };

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMake = e.target.value;
    const defaultModel = MAKE_MODELS[selectedMake]?.[0] || 'Standard';
    setFormData(prev => ({
      ...prev,
      make: selectedMake,
      model: defaultModel
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (plateCheck.exists) {
      setError(`Vehicle with registration number ${plateCheck.normalized} is already registered in the system.`);
      return;
    }
    if (plateCheck.valid === false) {
      setError(`Please enter a valid Indian vehicle registration number (e.g. MP04AB1234, DL01AB1234).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        registration_number: plateCheck.normalized || formData.registration_number.trim(),
        vin: formData.vin?.trim() ? formData.vin.trim().toUpperCase() : undefined,
        variant: formData.variant?.trim() || undefined,
        mileage_efficiency: formData.mileage_efficiency?.trim() || undefined,
        engine_details: formData.engine_details?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        rc_number: formData.rc_number?.trim() || undefined,
        image_url: formData.image_url?.trim() || undefined
      };

      if (payload.vin && payload.vin.length < 5) {
        setError("Chassis / VIN number must be at least 5 characters long if provided, or leave it blank to auto-generate.");
        setSubmitting(false);
        return;
      }

      const res = await api.post('/vehicles', payload);
      const newVehicle = res.data;
      navigate(`/vehicles/${newVehicle.registration_number || newVehicle.vin}`);
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/dashboard" className="hover:text-sky-400">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-200">Onboard Vehicle</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-600 text-white shadow-md">
                <Car className="w-6 h-6" />
              </div>
              Add New Vehicle to CarTrust AI
            </h1>
          </div>
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900"
          >
            Cancel
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Cannot Register Vehicle</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Registration Plate Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              1. Vehicle Registration & Identification
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Enter Indian vehicle registration plate. Automatic formatting accepts spaces and lowercase (e.g. <span className="text-sky-300 font-mono">MP 04 AB 1234</span> or <span className="text-sky-300 font-mono">mp04ab1234</span>).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registration / Number Plate <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="registration_number"
                    required
                    value={formData.registration_number}
                    onChange={handleChange}
                    placeholder="e.g. MP 04 AB 1234 or DL01AB1234"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base tracking-wider uppercase focus:outline-none focus:border-sky-500"
                  />
                  {plateCheck.checking && (
                    <div className="absolute right-3 top-3.5 text-xs text-slate-500">Checking...</div>
                  )}
                </div>

                {/* Live Normalization Pill & Status */}
                {plateCheck.normalized && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Standardized:</span>
                    <span className="font-mono px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/40 text-amber-300 font-bold tracking-widest">
                      {plateCheck.normalized}
                    </span>
                    {plateCheck.valid === true && !plateCheck.exists && (
                      <span className="text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid & Available
                      </span>
                    )}
                    {plateCheck.exists && (
                      <span className="text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" /> Already Registered!
                      </span>
                    )}
                    {plateCheck.valid === false && (
                      <span className="text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" /> Invalid Format
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Format: 2-letter State Code + RTO Code + Optional Series + 4-digit Number (e.g. MP04AB1234, DL01AB1234, MH12CD5678, 22BH1234AA).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chassis Number / VIN (Optional)
                </label>
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  placeholder="Auto-generated if left blank"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-sky-500 placeholder-slate-600"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  17-character ISO Vehicle Identification Number. If omitted, CarTrust creates a tamper-resistant canonical VIN.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Vehicle Make, Model & Variant */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Car className="w-5 h-5 text-indigo-400" />
              2. Vehicle Specifications
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Specify the manufacturer brand, model line, trim variant, and production year.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Make / Manufacturer <span className="text-rose-400">*</span>
                </label>
                <select
                  name="make"
                  value={formData.make}
                  onChange={handleMakeChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  {POPULAR_MAKES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Model <span className="text-rose-400">*</span>
                </label>
                {MAKE_MODELS[formData.make] ? (
                  <select
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                  >
                    {MAKE_MODELS[formData.make].map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                    <option value="Other">Other / Custom</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    name="model"
                    required
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="e.g. City"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Variant / Trim
                </label>
                <input
                  type="text"
                  name="variant"
                  value={formData.variant}
                  onChange={handleChange}
                  placeholder="e.g. VX Manual or ZXI+"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Manufacturing Year <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  name="year"
                  required
                  min={1990}
                  max={2030}
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registration Year
                </label>
                <input
                  type="number"
                  name="registration_year"
                  min={1990}
                  max={2030}
                  value={formData.registration_year}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fuel Type <span className="text-rose-400">*</span>
                </label>
                <select
                  name="fuel_type"
                  value={formData.fuel_type}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="LPG">LPG</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Transmission <span className="text-rose-400">*</span>
                </label>
                <select
                  name="transmission"
                  value={formData.transmission}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                  <option value="CVT">CVT</option>
                  <option value="DCT">DCT</option>
                  <option value="AMT">AMT</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Performance, Odometer & Ownership */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-emerald-400" />
              3. Odometer, Efficiency & Ownership
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Mileage figures establish the baseline for future timeline verification and rollback detection.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Current Odometer (km) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="current_odometer"
                    required
                    min={0}
                    value={formData.current_odometer}
                    onChange={handleChange}
                    className="w-full pl-4 pr-12 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-sky-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-medium">km</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fuel Efficiency / Mileage
                </label>
                <input
                  type="text"
                  name="mileage_efficiency"
                  value={formData.mileage_efficiency}
                  onChange={handleChange}
                  placeholder="e.g. 17.8 km/l or 450 km/charge"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ownership Details
                </label>
                <select
                  name="ownership_status"
                  value={formData.ownership_status}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="FIRST">First Owner (1st)</option>
                  <option value="SECOND">Second Owner (2nd)</option>
                  <option value="THIRD">Third Owner (3rd)</option>
                  <option value="FOURTH_PLUS">4th Owner or Above</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Engine Details & Displacement
                </label>
                <input
                  type="text"
                  name="engine_details"
                  value={formData.engine_details}
                  onChange={handleChange}
                  placeholder="e.g. 1498 cc, 4-Cylinder i-VTEC, 119 bhp"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  RC / Registration Certificate Number
                </label>
                <input
                  type="text"
                  name="rc_number"
                  value={formData.rc_number}
                  onChange={handleChange}
                  placeholder="e.g. RC-MP04AB1234"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono uppercase focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Commercial Details, Location & Media */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-amber-400" />
              4. Price, Location & Photographs
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Provide valuation benchmark and market location.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Purchase / Estimated Selling Price (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    name="price"
                    min={0}
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ₹{Number(formData.price || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Location (City, State)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Bhopal, Madhya Pradesh"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vehicle Image URL (Optional)
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
              {formData.image_url && (
                <div className="mt-3 flex items-center gap-4">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-20 h-14 object-cover rounded-lg border border-slate-700"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <span className="text-xs text-slate-400">Image preview</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Button */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Link
              to="/dashboard"
              className="px-5 py-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || plateCheck.exists === true}
              className="px-7 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all"
            >
              {submitting ? 'Onboarding Vehicle...' : 'Onboard Vehicle to CarTrust'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
