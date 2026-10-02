import { NavLink } from "react-router-dom";

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                🚚 Smart Logistics
            </div>

            <div className="navbar-links">
                <NavLink to="/">
                    Dashboard
                </NavLink>

                <NavLink to="/locations">
                    Locations
                </NavLink>

                <NavLink to="/connections">
                    Connections
                </NavLink>
                <NavLink to="/graph">
                    Graph Explorer
                </NavLink>

                <NavLink to="/delivery-tasks">
                    Delivery Tasks
                </NavLink>
            </div>
        </nav>
    );
}


export default Navbar;