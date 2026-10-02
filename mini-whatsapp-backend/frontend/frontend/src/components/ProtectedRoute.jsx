import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {

    const accessToken =
        localStorage.getItem(
            "accessToken"
        );

    const refreshToken =
        localStorage.getItem(
            "refreshToken"
        );

    // User is not logged in
    if (
        !accessToken &&
        !refreshToken
    ) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return children;
}

export default ProtectedRoute;