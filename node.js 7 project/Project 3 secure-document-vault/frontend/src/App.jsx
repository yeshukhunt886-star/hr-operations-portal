import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import UploadDocument from "./pages/UploadDocument";
import DocumentDetails from "./pages/DocumentDetails";
import SharedDocuments from "./pages/SharedDocuments";
import ShareDocument from "./pages/ShareDocument";
import ShareLinks from "./pages/ShareLinks";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <>
      <Routes>

        {/* Public */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* Protected application */}
        <Route
          element={<ProtectedRoute />}
        >
          <Route
            element={<Navbar />}
          >
            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/documents"
              element={<Documents />}
            />

            <Route
              path="/documents/upload"
              element={<UploadDocument />}
            />

            <Route
              path="/documents/:id"
              element={<DocumentDetails />}
            />

            <Route
              path="/documents/:id/share"
              element={<ShareDocument />}
            />

            <Route
              path="/documents/:id/share-links"
              element={<ShareLinks />}
            />

            <Route
              path="/shared"
              element={<SharedDocuments />}
            />
          </Route>
        </Route>

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>
    </>
  );
}

export default App;