import {useNavigate} from "react-router-dom";

const Navbar=()=>{

const navigate=useNavigate();

const logout=()=>{

localStorage.clear();

navigate("/");

};

return(

<div className="navbar">

<h3>Admin Panel</h3>

<button onClick={logout}>Logout</button>

</div>

);

};

export default Navbar;