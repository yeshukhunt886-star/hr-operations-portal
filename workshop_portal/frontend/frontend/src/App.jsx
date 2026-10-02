import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Workshops from "./pages/Workshops";
import Participants from "./pages/Participants";
import Reports from "./pages/Reports";
import CheckIn from "./pages/CheckIn";
import Announcements from "./pages/Announcements";
import NotFound from "./pages/NotFound";


function App() {


    return (

        <Routes>



            {/* Login */}

            <Route

                path="/"

                element={<Login />}

            />





            {/* Dashboard - Admin Only */}

            <Route

                path="/dashboard"

                element={

                    <ProtectedRoute

                    allowedRoles={[
                        "admin"
                    ]}

                    >

                        <Layout>

                            <Dashboard />

                        </Layout>

                    </ProtectedRoute>

                }

            />





            {/* Workshops - Admin Only */}

            <Route

                path="/workshops"

                element={

                    <ProtectedRoute

                    allowedRoles={[
                        "admin"
                    ]}

                    >

                        <Layout>

                            <Workshops />

                        </Layout>

                    </ProtectedRoute>

                }

            />





            {/* Participants - Admin + Checkin Staff */}

            <Route

                path="/participants"

                element={

                    <ProtectedRoute

                    allowedRoles={[
                        "admin",
                        "checkin_staff",
                        "staff"
                    ]}

                    >

                        <Layout>

                            <Participants />

                        </Layout>

                    </ProtectedRoute>

                }

            />





            {/* Check-in - Admin + Checkin Staff */}

           <Route
              path="/checkin"
              element={
              <ProtectedRoute

              allowedRoles={[
              "admin",
              "checkin_staff",
              "staff"
              ]}

              >

              <Layout>

              <CheckIn />

              </Layout>

              </ProtectedRoute>
              }
            />





            {/* Reports - Admin + Viewer */}

            <Route

                path="/reports"

                element={

                    <ProtectedRoute

                    allowedRoles={[
                        "admin",
                        "viewer"
                    ]}

                    >

                        <Layout>

                            <Reports />

                        </Layout>

                    </ProtectedRoute>

                }

            />





            {/* Announcements - Admin Only */}

            <Route

                path="/announcements"

                element={

                    <ProtectedRoute

                    allowedRoles={[
                        "admin"
                    ]}

                    >

                        <Layout>

                            <Announcements />

                        </Layout>

                    </ProtectedRoute>

                }

            />





            {/* 404 */}

            <Route

                path="*"

                element={<NotFound />}

            />


        </Routes>

    );

}


export default App;