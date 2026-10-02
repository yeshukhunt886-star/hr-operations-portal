import { useNavigate } from "react-router-dom";

function Dashboard() {

    const navigate = useNavigate();

    const user =
        JSON.parse(
            localStorage.getItem("user")
        );

    const handleLogout = () => {

        localStorage.removeItem(
            "accessToken"
        );

        localStorage.removeItem(
            "refreshToken"
        );

        localStorage.removeItem(
            "user"
        );

        navigate("/login");
    };

    return (
        <div className="dashboard">

            <h1>
                Welcome to Chat App
            </h1>

            <h2>
                Hello, {user?.username || "User"}
            </h2>

            <p>
                You are successfully logged in.
            </p>

            <button
                onClick={handleLogout}
            >
                Logout
            </button>

        </div>
    );
}

export default Dashboard;