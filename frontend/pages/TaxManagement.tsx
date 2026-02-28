import React, { useState } from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { TaxRule } from '../../types';
import { US_STATES } from '../../services/taxService';
import { useToast } from '../../hooks/useToast';
import { TrashIcon } from '../../components/Icons';

const TaxManagement: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useSiteSettings();
  const { addToast } = useToast();
  const [rules, setRules] = useState<TaxRule[]>(siteSettings.taxConfig.rules || []);
  const [enableTax, setEnableTax] = useState(siteSettings.taxConfig.enableTaxCollection);
  const [defaultRate, setDefaultRate] = useState(siteSettings.taxConfig.defaultTaxRate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TaxRule>>({
    name: '',
    states: [],
    taxRate: 0,
    exemptedProductIds: [],
    enabled: true,
    priority: 0,
  });

  const handleAddRule = () => {
    if (!formData.name || formData.states?.length === 0) {
      addToast('Rule name and at least one state are required', 'error');
      return;
    }

    const newRule: TaxRule = {
      id: editingId || Date.now().toString(),
      name: formData.name || '',
      states: formData.states || [],
      taxRate: formData.taxRate || 0,
      exemptedProductIds: formData.exemptedProductIds || [],
      enabled: formData.enabled !== false,
      priority: formData.priority || 0,
    };

    if (editingId) {
      setRules(rules.map((r) => (r.id === editingId ? newRule : r)));
      setEditingId(null);
      addToast('Tax rule updated', 'success');
    } else {
      setRules([...rules, newRule]);
      addToast('Tax rule added', 'success');
    }

    resetForm();
  };

  const handleEditRule = (rule: TaxRule) => {
    setFormData(rule);
    setEditingId(rule.id);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    addToast('Tax rule deleted', 'success');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      states: [],
      taxRate: 0,
      exemptedProductIds: [],
      enabled: true,
      priority: 0,
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    await updateSiteSettings({
      ...siteSettings,
      taxConfig: {
        provider: siteSettings.taxConfig.provider,
        enableTaxCollection: enableTax,
        defaultTaxRate: defaultRate,
        taxIncludedInPrice: siteSettings.taxConfig.taxIncludedInPrice,
        credentials: siteSettings.taxConfig.credentials,
        rules,
      },
    });
    addToast('Tax settings saved', 'success');
  };

  const toggleState = (state: string) => {
    const newStates = formData.states || [];
    if (newStates.includes(state)) {
      setFormData({ ...formData, states: newStates.filter((s) => s !== state) });
    } else {
      setFormData({ ...formData, states: [...newStates, state] });
    }
  };

  return (
    <div className="bg-slate-900 p-8 rounded-lg border border-slate-700">
      <h1 className="text-3xl font-bold text-white mb-8">Tax Management</h1>

      {/* Global Settings */}
      <div className="bg-slate-800 p-6 rounded-lg mb-8 border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">Global Settings</h2>
        
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={enableTax}
              onChange={(e) => setEnableTax(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-white">Enable Tax Collection</span>
          </label>

          <div>
            <label className="block text-white mb-2">Default Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={defaultRate}
              onChange={(e) => setDefaultRate(parseFloat(e.target.value))}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
            <p className="text-sm text-gray-400 mt-1">
              Used when no state-specific rule matches
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-sky-500 text-white font-bold py-2 rounded-lg hover:bg-sky-600 transition-colors"
          >
            Save Global Settings
          </button>
        </div>
      </div>

      {/* Add/Edit Rule Form */}
      <div className="bg-slate-800 p-6 rounded-lg mb-8 border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          {editingId ? 'Edit Tax Rule' : 'Add New Tax Rule'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-white mb-2">Rule Name</label>
            <input
              type="text"
              placeholder="e.g., California Sales Tax"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.taxRate || 0}
              onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Priority (higher = applies first)</label>
            <input
              type="number"
              min="0"
              value={formData.priority || 0}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-white mb-2">States (click to select)</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto bg-slate-700 p-4 rounded-md border border-slate-600">
              {US_STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => toggleState(state)}
                  className={`p-2 rounded-md font-semibold transition-colors ${
                    (formData.states || []).includes(state)
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Selected: {(formData.states || []).join(', ') || 'None'}
            </p>
          </div>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.enabled !== false}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-white">Enabled</span>
          </label>

          <div className="flex space-x-2">
            <button
              onClick={handleAddRule}
              className="flex-1 bg-sky-500 text-white font-bold py-2 rounded-lg hover:bg-sky-600 transition-colors"
            >
              {editingId ? 'Update Rule' : 'Add Rule'}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="flex-1 bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tax Rules List */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">Tax Rules</h2>
        
        {rules.length === 0 ? (
          <p className="text-gray-400">No tax rules configured yet.</p>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-semibold">{rule.name}</h3>
                    <p className="text-gray-400 text-sm">
                      Rate: {rule.taxRate}% | Priority: {rule.priority} | Status:{' '}
                      <span className={rule.enabled ? 'text-green-400' : 'text-red-400'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete tax rule"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-300 text-sm">States: {rule.states.join(', ')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxManagement;
