import {
    BrowserRouter,
    Routes,
    Route,
    Link
} from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import Locations from "./pages/Locations.jsx";
import Connections from "./pages/Connections.jsx";
import GraphExplorer from "./pages/GraphExplorer.jsx";
import DeliveryTasks from "./pages/DeliveryTasks.jsx";

const Dashboard = () => {
    return (
        <div className="page">
            <div className="hero">
                <h1>Smart Logistics</h1>

                <p>
                    Route planning and bulk
                    delivery processing platform.
                </p>
            </div>

            <div className="dashboard-grid">

                <Link
                    to="/locations"
                    className="card dashboard-card-link"
                >
                    <h2>Locations</h2>

                    <p>
                        Manage warehouses, hubs,
                        cities and delivery points.
                    </p>

                    <span className="card-link">
                        Manage Locations →
                    </span>
                </Link>

                <Link
                    to="/connections"
                    className="card dashboard-card-link"
                >
                    <h2>Connections</h2>

                    <p>
                        Create weighted directed or
                        bidirectional roads.
                    </p>

                    <span className="card-link">
                        Manage Connections →
                    </span>
                </Link>

                <Link
                    to="/graph"
                    className="card dashboard-card-link"
                >
                    <h2>Graph Explorer</h2>

                    <p>
                        Test BFS, DFS and Dijkstra
                        algorithms on the logistics graph.
                    </p>

                    <span className="card-link">
                        Open Graph Explorer →
                    </span>
                </Link>

                <Link
                    to="/delivery-tasks"
                    className="card dashboard-card-link"
                >
                    <h2>Delivery Tasks</h2>

                    <p>
                        Create and process delivery
                        tasks using priority queues.
                    </p>

                    <span className="card-link">
                        Manage Delivery Tasks →
                    </span>
                </Link>

            </div>
        </div>
    );
};

function App() {
    return (
        <BrowserRouter>

            <Navbar />

            <Routes>

                <Route
                    path="/"
                    element={<Dashboard />}
                />

                <Route
                    path="/locations"
                    element={<Locations />}
                />

                <Route
                    path="/connections"
                    element={<Connections />}
                />

                <Route
                    path="/graph"
                    element={<GraphExplorer />}
                />

                <Route
                    path="/delivery-tasks"
                    element={<DeliveryTasks />}
                />

                {/* Keep /deliveries working as an alias */}
                <Route
                    path="/deliveries"
                    element={<DeliveryTasks />}
                />

            </Routes>

        </BrowserRouter>
    );
}

export default App;

