import { Navigate } from "react-router-dom";


const ProtectedRoute = ({
    children,
    allowedRoles = []
}) => {


    const user = JSON.parse(
        localStorage.getItem("user")
    );

    if(!user){

        return <Navigate to="/" />;

    }


    const role = user.role;

    if(
        allowedRoles.length > 0 &&
        !allowedRoles.includes(role)
    ){
        return <Navigate to="/" />;

    }


    return children;

};


export default ProtectedRoute;