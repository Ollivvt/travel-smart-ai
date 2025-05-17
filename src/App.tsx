import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Trips } from './pages/Trips';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NewTrip } from './pages/NewTrip';
import { TripView } from './pages/TripView';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

// For development: redirect to a specific trip
const DEV_TRIP_ID = '65905621-528f-4e51-952d-8a521ffd5de4';

function App() {
  return (
    <GoogleOAuthProvider 
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
        loadingElement={<div>Loading maps...</div>}
      >
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <Routes>
                {/* Redirect root to trip view in development */}
                <Route path="/" element={<Home />} />
                <Route path="/trips" element={<Trips />} />
                {/*}
                <Route path="/" element={<Navigate to={`/trip/${DEV_TRIP_ID}`} replace />} />
                */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/new-trip" element={<NewTrip />} />
                <Route path="/trip/:id" element={<TripView />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </LoadScript>
    </GoogleOAuthProvider>
  );
}

export default App;