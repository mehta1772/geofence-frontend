// ============================================
// FILE: src/components/Dashboard.js
// REPLACE THE ENTIRE FILE WITH THIS CODE
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

function Dashboard({ user, onLogout, token }) {
  const [activeTab, setActiveTab] = useState('setup');
  const [homeLocation, setHomeLocation] = useState({
    lat: 28.6139,
    lng: 77.2090,
    address: 'New Delhi, India',
    radius: 500
  });
  const [members, setMembers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    relation: ''
  });
  const [searchAddress, setSearchAddress] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchMembers();
    fetchAlerts();
    const interval = setInterval(fetchMembers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API_URL}/members`, config);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_URL}/alerts`, config);
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const searchLocation = async () => {
    if (!searchAddress.trim()) {
      alert('Please enter an address to search');
      return;
    }
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      const response = await axios.get(`${API_URL}/geocode/search`, {
        params: { q: searchAddress }
      });
      
      if (response.data && response.data.length > 0) {
        setSearchResults(response.data);
      } else {
        alert('❌ No results found. Try:\n- Adding city name\n- Being more specific\n- Using manual coordinates below');
      }
    } catch (error) {
      alert('Error searching location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = async (result) => {
    setHomeLocation({
      ...homeLocation,
      lat: result.lat,
      lng: result.lng,
      address: result.address
    });
    
    // Save to backend
    await saveLocationToBackend(result.lat, result.lng, result.address, homeLocation.radius);
    setSearchResults([]);
    setSearchAddress('');
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    if (!confirm('Use your current device location as home location?')) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Get address from coordinates
        try {
          const response = await axios.get(`${API_URL}/geocode/reverse`, {
            params: { lat, lng }
          });
          
          const address = response.data.address || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          
          setHomeLocation({
            ...homeLocation,
            lat: lat,
            lng: lng,
            address: address
          });
          
          await saveLocationToBackend(lat, lng, address, homeLocation.radius);
          alert('✅ Current location set as home!');
        } catch (error) {
          console.error('Error getting address:', error);
          const address = `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setHomeLocation({
            ...homeLocation,
            lat: lat,
            lng: lng,
            address: address
          });
          await saveLocationToBackend(lat, lng, address, homeLocation.radius);
          alert('✅ Current location set as home!');
        }
      },
      (error) => {
        alert('Error getting your location. Please check permissions.');
      },
      { enableHighAccuracy: true }
    );
  };

  const setManualCoordinates = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Invalid coordinates range. Lat: -90 to 90, Lng: -180 to 180');
      return;
    }

    const address = customAddress.trim() || `Custom Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    setHomeLocation({
      ...homeLocation,
      lat: lat,
      lng: lng,
      address: address
    });
    
    await saveLocationToBackend(lat, lng, address, homeLocation.radius);
    setManualLat('');
    setManualLng('');
    setCustomAddress('');
    alert('✅ Manual location set successfully!');
  };

  const saveLocationToBackend = async (lat, lng, address, radius) => {
    try {
      await axios.put(`${API_URL}/members/${user.id}/location`, {
        lat, lng, address, radius
      }, config);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const updateRadius = async (newRadius) => {
    setHomeLocation({ ...homeLocation, radius: newRadius });
    await saveLocationToBackend(
      homeLocation.lat, 
      homeLocation.lng, 
      homeLocation.address, 
      newRadius
    );
  };

  const addMember = async () => {
    if (!newMember.name || !newMember.email) {
      alert('Name and email are required');
      return;
    }
    try {
      await axios.post(`${API_URL}/members`, newMember, config);
      setNewMember({ name: '', email: '', phone: '', relation: '' });
      fetchMembers();
      alert('✅ Member added successfully!');
    } catch (error) {
      alert('Error adding member');
    }
  };

  const deleteMember = async (id) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await axios.delete(`${API_URL}/members/${id}`, config);
      fetchMembers();
    } catch (error) {
      alert('Error removing member');
    }
  };

  const copyTrackingLink = (memberId, token) => {
    const link = `${window.location.origin}/track.html?id=${memberId}&token=${token}`;
    navigator.clipboard.writeText(link);
    alert('✅ Tracking link copied! Send this to the family member.');
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${homeLocation.lat},${homeLocation.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">📍</div>
            <div>
              <h1>GeoGuard Pro</h1>
              <p>Admin: {user.email}</p>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="tabs">
        {['setup', 'members', 'monitor', 'help'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'tab active' : 'tab'}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'setup' && (
          <div className="section">
            <div className="card">
              <h2>🏠 Set Your Home Location</h2>
              <div className="alert alert-info">
                <strong>3 Ways to Set Location:</strong>
                <br/>1. Search by address (offices, buildings, landmarks)
                <br/>2. Use your current device location
                <br/>3. Enter exact coordinates manually
              </div>

              {/* Method 1: Search Address */}
              <div className="location-method">
                <h3>Method 1: Search Address</h3>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Try: 'Madhav PG Sector 63 Noida' or 'VDS Business Park Noida'"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  />
                  <button onClick={searchLocation} disabled={searching}>
                    {searching ? 'Searching...' : '🔍 Search'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="search-results">
                    <p className="results-header">Found {searchResults.length} result(s). Select one:</p>
                    {searchResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="search-result-item"
                        onClick={() => selectSearchResult(result)}
                      >
                        <div className="result-icon">📍</div>
                        <div className="result-info">
                          <p className="result-address">{result.address}</p>
                          <small className="result-coords">
                            {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                          </small>
                        </div>
                        <button className="result-select-btn">Select</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Method 2: Current Location */}
              <div className="location-method">
                <h3>Method 2: Use Current Location</h3>
                <button onClick={useCurrentLocation} className="btn-secondary">
                  📍 Use My Current Location
                </button>
                <small className="method-note">Your device must have GPS/location enabled</small>
              </div>

              {/* Method 3: Manual Coordinates */}
              <div className="location-method">
                <h3>Method 3: Enter Manual Coordinates</h3>
                <div className="manual-coords-grid">
                  <input
                    type="text"
                    placeholder="Latitude (e.g., 28.6139)"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Longitude (e.g., 77.2090)"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Custom Address Name (optional)"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    style={{ gridColumn: '1 / -1' }}
                  />
                </div>
                <button onClick={setManualCoordinates} className="btn-secondary">
                  ✓ Set Manual Location
                </button>
                <small className="method-note">
                  Tip: Use Google Maps → Right click location → Copy coordinates
                </small>
              </div>

              <div className="divider"></div>

              {/* Current Location Display */}
              <div className="current-location-display">
                <h3>📌 Current Home Location</h3>
                <div className="location-info-card">
                  <div className="location-detail">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{homeLocation.address}</span>
                  </div>
                  <div className="location-detail">
                    <span className="detail-label">Coordinates:</span>
                    <span className="detail-value">
                      {homeLocation.lat.toFixed(6)}, {homeLocation.lng.toFixed(6)}
                    </span>
                  </div>
                  <button onClick={openGoogleMaps} className="btn-small">
                    🗺️ View on Google Maps
                  </button>
                </div>
              </div>

              {/* Radius Control */}
              <div className="radius-control">
                <label>
                  Geofence Radius: <strong>{homeLocation.radius} meters</strong>
                  <span className="radius-hint"> ({(homeLocation.radius / 1000).toFixed(1)} km)</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={homeLocation.radius}
                  onChange={(e) => updateRadius(parseInt(e.target.value))}
                />
                <div className="radius-markers">
                  <span>100m</span>
                  <span>1000m</span>
                  <span>2000m</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="section">
            <div className="card">
              <h2>👨‍👩‍👧‍👦 Add Family Members</h2>
              <div className="alert alert-info">
                Step 2: Add people you want to track. They will get a tracking link.
              </div>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Name *"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Relation (e.g., Father, Employee)"
                  value={newMember.relation}
                  onChange={(e) => setNewMember({...newMember, relation: e.target.value})}
                />
              </div>
              <button onClick={addMember} className="btn-primary">➕ Add Member</button>
            </div>

            <div className="card">
              <h2>Registered Members ({members.length})</h2>
              {members.length === 0 ? (
                <p className="empty-state">No members yet. Add one above!</p>
              ) : (
                <div className="members-list">
                  {members.map(member => (
                    <div key={member._id} className="member-card">
                      <div className="member-info">
                        <div className={`avatar ${member.status}`}>
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <h3>{member.name}</h3>
                          <p>{member.relation} • {member.email}</p>
                          <span className={`status-badge ${member.status}`}>
                            {member.status === 'inside' ? '✓ Inside Zone' : 
                             member.status === 'outside' ? '⚠ Outside Zone' : '○ Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="member-actions">
                        <div className="tracking-info">
                          <p><strong>Member ID:</strong> <code>{member._id}</code></p>
                          <p><strong>Token:</strong> <code>{member.trackingToken}</code></p>
                          <button
                            onClick={() => copyTrackingLink(member._id, member.trackingToken)}
                            className="btn-small btn-copy"
                          >
                            📋 Copy Tracking Link
                          </button>
                          <small className="tracking-note">
                            Send this link to {member.name} via WhatsApp/Email
                          </small>
                        </div>
                        <button
                          onClick={() => deleteMember(member._id)}
                          className="btn-danger"
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="section">
            <div className="stats">
              <div className="stat-card blue">
                <h3>Total Members</h3>
                <p className="stat-number">{members.length}</p>
              </div>
              <div className="stat-card green">
                <h3>Inside Zone</h3>
                <p className="stat-number">
                  {members.filter(m => m.status === 'inside').length}
                </p>
              </div>
              <div className="stat-card orange">
                <h3>Outside Zone</h3>
                <p className="stat-number">
                  {members.filter(m => m.status === 'outside').length}
                </p>
              </div>
            </div>

            <div className="card">
              <h2>🗺️ Location Overview</h2>
              <div className="location-summary">
                <p><strong>Home Base:</strong> {homeLocation.address}</p>
                <p><strong>Geofence Radius:</strong> {homeLocation.radius}m</p>
                <p><strong>Auto-refresh:</strong> Every 5 seconds</p>
              </div>
            </div>

            <div className="card">
              <h2>📊 Recent Alerts</h2>
              {alerts.length === 0 ? (
                <p className="empty-state">No alerts yet. Alerts appear when members enter/exit the zone.</p>
              ) : (
                <div className="alerts-list">
                  {alerts.slice(0, 10).map(alert => (
                    <div key={alert._id} className={`alert-item ${alert.type}`}>
                      <span className="alert-icon">
                        {alert.type === 'entered' ? '✓' : '⚠'}
                      </span>
                      <div className="alert-content">
                        <p className="alert-text">
                          <strong>{alert.memberName}</strong> {alert.type} the geofence zone
                        </p>
                        <small className="alert-time">{new Date(alert.timestamp).toLocaleString()}</small>
                        {alert.emailSent && (
                          <small className="alert-email">📧 Email notification sent</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="section">
            <div className="card">
              <h2>📚 Complete Usage Guide</h2>
              <div className="help-steps">
                <div className="help-step">
                  <div className="step-number">1</div>
                  <div>
                    <h3>Set Home Location (3 Ways)</h3>
                    <ul>
                      <li><strong>Search:</strong> Type office/home address and select from results</li>
                      <li><strong>Current Location:</strong> Click button to use your GPS location</li>
                      <li><strong>Manual:</strong> Enter exact lat/lng from Google Maps</li>
                    </ul>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-number">2</div>
                  <div>
                    <h3>Add Family Members / Employees</h3>
                    <p>Go to Members tab, enter their details, click Add Member</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-number">3</div>
                  <div>
                    <h3>Share Tracking Links</h3>
                    <p>Click "Copy Tracking Link" for each member and send via WhatsApp/SMS/Email</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-number">4</div>
                  <div>
                    <h3>Monitor & Get Email Alerts</h3>
                    <p>Check Monitor tab anytime. Get automatic emails when anyone enters/exits zone</p>
                  </div>
                </div>
              </div>

              <div className="help-tips">
                <h3>💡 Pro Tips</h3>
                <ul>
                  <li>For offices: Search "Company Name + City" for best results</li>
                  <li>Can't find location? Use Google Maps to get exact coordinates</li>
                  <li>Test with yourself first: Add yourself as member, open tracking link on your phone</li>
                  <li>Radius 500m works well for homes, 100-200m for small offices</li>
                  <li>Members must keep tracking page open on their phone</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;