import { useState } from 'react';
import '../index.css';

export default function FormBuilder() {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<{name: string, type: string}[]>([]);

  const addField = () => {
    setFields([...fields, { name: '', type: 'text' }]);
  };

  const saveForm = () => {
    // In a real implementation this would post the dynamic form schema to the backend
    alert('Dynamic Form Schema Saved (Mocked for Prototype).');
  };

  return (
    <div className="card">
      <h2>Dynamic Form Builder</h2>
      <p>This allows admins to build forms without hardcoding them in React.</p>
      
      <div className="form-group">
        <label>Form Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CS 405 Weekly Activity Log" />
      </div>

      <hr style={{ margin: '2rem 0' }} />
      <h3>Fields</h3>
      
      {fields.map((f, i) => (
        <div key={i} className="grid" style={{ marginBottom: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Field Name</label>
            <input 
              value={f.name} 
              onChange={e => {
                const newFields = [...fields];
                newFields[i].name = e.target.value;
                setFields(newFields);
              }} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Field Type</label>
            <select 
              value={f.type} 
              onChange={e => {
                const newFields = [...fields];
                newFields[i].type = e.target.value;
                setFields(newFields);
              }}
            >
              <option value="text">Short Text</option>
              <option value="textarea">Long Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>
      ))}

      <button onClick={addField} className="btn btn-secondary" style={{ marginRight: '1rem' }}>+ Add Field</button>
      <button onClick={saveForm} className="btn">Save Form</button>
    </div>
  );
}
